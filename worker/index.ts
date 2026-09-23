import { Worker, type Job } from "bullmq";
import { connection } from "../lib/redis";
import { supabase } from "../lib/supabase";
import type { Endpoint, Event } from "../lib/types";

// Timeout for the outbound POST to an endpoint's URL, so a hanging
// destination can't block the worker forever.
const DELIVERY_TIMEOUT_MS = 5000;

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

  console.log(`Processing event ${event.id} -> POSTing to ${endpoint.url}`);

  let statusCode: number | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    attempt_number: 1,
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
  } else {
    console.log(`Delivery failed: ${errorMessage}`);
  }
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
