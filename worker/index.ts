import { Worker, type Job } from "bullmq";
import { connection, deliveriesQueue } from "../lib/redis";
import { supabase } from "../lib/supabase";
import { computeNextRetry } from "../lib/backoff";
import type { Endpoint, Event } from "../lib/types";

// Timeout for the outbound POST to an endpoint's URL, so a hanging
// destination can't block the worker forever.
const DELIVERY_TIMEOUT_MS = 5000;

// For local testing only: set RELAYD_FAST_RETRY=1 (or any truthy value) to
// use a much shorter retry schedule (5s/10s/15s/20s, dead-letter at attempt
// 5) instead of the real schedule from lib/backoff.ts, so the full
// retry-to-dead-letter cycle can be watched in under a minute. Never used
// by default — the real computeNextRetry schedule always runs unless this
// is explicitly set.
const FAST_RETRY_SCHEDULE_MS: Record<number, number> = {
  1: 5000,
  2: 10000,
  3: 15000,
  4: 20000,
};
const FAST_RETRY_MAX_ATTEMPTS = 5;

function getNextRetry(attemptNumber: number): { delayMs: number } | { deadLetter: true } {
  if (process.env.RELAYD_FAST_RETRY) {
    if (attemptNumber >= FAST_RETRY_MAX_ATTEMPTS) {
      return { deadLetter: true };
    }
    return { delayMs: FAST_RETRY_SCHEDULE_MS[attemptNumber] };
  }

  return computeNextRetry(attemptNumber);
}

async function processDelivery(job: Job<{ eventId: string }>) {
  const { eventId } = job.data;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select()
    .eq("id", eventId)
    .single<Event>();

  if (eventError || !event) {
    throw new Error(
      `Failed to load event ${eventId}: ${eventError?.message ?? "not found"}`
    );
  }

  // Protects against duplicate delivery in this scenario: the worker
  // successfully POSTs to the endpoint, then crashes before writing
  // 'delivered' back to the events table. On restart, BullMQ redelivers the
  // job (its at-least-once delivery guarantee), and without this check the
  // receiver would get the same event a second time. This is not a complete
  // solution (a crash between this check and the HTTP call isn't covered),
  // but it handles the realistic case cheaply without needing DB locking or
  // a transactional outbox.
  if (event.status === "delivered") {
    console.log(`Event ${event.id} already delivered, skipping duplicate job`);
    return;
  }

  const { data: endpoint, error: endpointError } = await supabase
    .from("endpoints")
    .select()
    .eq("id", event.endpoint_id)
    .single<Endpoint>();

  if (endpointError || !endpoint) {
    throw new Error(
      `Failed to load endpoint ${event.endpoint_id}: ${
        endpointError?.message ?? "not found"
      }`
    );
  }

  const { count: previousAttempts, error: countError } = await supabase
    .from("delivery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (countError) {
    throw new Error(
      `Failed to count previous delivery attempts for event ${event.id}: ${countError.message}`
    );
  }

  const attemptNumber = (previousAttempts ?? 0) + 1;

  console.log(
    `Processing event ${event.id} (attempt ${attemptNumber}) -> POSTing to ${endpoint.url}`
  );

  let statusCode: number | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": event.idempotency_key,
        },
        body: JSON.stringify(event.payload),
        signal: controller.signal,
      });

      statusCode = response.status;
      success = response.status >= 200 && response.status < 300;
      if (!success) {
        errorMessage = `Received non-2xx status code: ${response.status}`;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    success = false;
    statusCode = null;
    errorMessage =
      err instanceof Error && err.name === "AbortError"
        ? `Request timed out after ${DELIVERY_TIMEOUT_MS}ms`
        : err instanceof Error
        ? err.message
        : String(err);
  }

  const { error: attemptError } = await supabase.from("delivery_attempts").insert({
    event_id: event.id,
    attempt_number: attemptNumber,
    status_code: statusCode,
    success,
    error_message: errorMessage,
  });

  if (attemptError) {
    console.error(
      `Failed to record delivery attempt for event ${event.id}: ${attemptError.message}`
    );
  }

  if (success) {
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "delivered" })
      .eq("id", event.id);

    if (updateError) {
      console.error(
        `Failed to update event ${event.id} status to delivered: ${updateError.message}`
      );
    }

    console.log(`Delivered successfully (status ${statusCode})`);
    return;
  }

  console.log(`Delivery failed: ${errorMessage}`);

  // A manually-retried 'dead' event (via the retry API) resumes counting
  // from its existing delivery_attempts rows, so attemptNumber can exceed
  // the normal 5-attempt ceiling (e.g. attempt 6). computeNextRetry throws
  // for any attemptNumber outside 1-5, which is correct for that function's
  // contract — but here, a failure past the ceiling must still result in
  // 'dead' status, not an unhandled crash. Treat that throw the same as a
  // deadLetter: true result.
  let nextRetry: { delayMs: number } | { deadLetter: true };
  try {
    nextRetry = getNextRetry(attemptNumber);
  } catch {
    console.log(
      `Attempt ${attemptNumber} failed and exceeds the normal retry ceiling — marking as dead`
    );
    nextRetry = { deadLetter: true };
  }

  if ("deadLetter" in nextRetry) {
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "dead" })
      .eq("id", event.id);

    if (updateError) {
      console.error(
        `Failed to update event ${event.id} status to dead: ${updateError.message}`
      );
    }

    console.log(
      `Attempt ${attemptNumber} failed, max attempts reached — marking as dead`
    );
    return;
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({ status: "retrying" })
    .eq("id", event.id);

  if (updateError) {
    console.error(
      `Failed to update event ${event.id} status to retrying: ${updateError.message}`
    );
  }

  await deliveriesQueue.add(
    "deliver",
    { eventId: event.id },
    { delay: nextRetry.delayMs }
  );

  console.log(
    `Attempt ${attemptNumber} failed, retrying in ${nextRetry.delayMs}ms`
  );
}

const worker = new Worker<{ eventId: string }>(
  "deliveries",
  processDelivery,
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} threw an error:`, err);
});

console.log("Delivery worker started, listening for jobs on the \"deliveries\" queue.");
