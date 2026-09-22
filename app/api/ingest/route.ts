import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deliveriesQueue } from "@/lib/redis";
import type { Event } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { endpoint_id, event_type, payload } = body ?? {};

  if (!endpoint_id || typeof endpoint_id !== "string") {
    return NextResponse.json(
      { error: "`endpoint_id` is required and must be a string." },
      { status: 400 }
    );
  }

  if (!event_type || typeof event_type !== "string") {
    return NextResponse.json(
      { error: "`event_type` is required and must be a string." },
      { status: 400 }
    );
  }

  if (payload === undefined) {
    return NextResponse.json(
      { error: "`payload` is required." },
      { status: 400 }
    );
  }

  const { data: endpoint, error: endpointError } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpoint_id)
    .maybeSingle();

  if (endpointError) {
    return NextResponse.json(
      { error: `Failed to look up endpoint: ${endpointError.message}` },
      { status: 500 }
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: `No endpoint found with id: ${endpoint_id}` },
      { status: 404 }
    );
  }

  const idempotency_key = randomUUID();

  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      endpoint_id,
      event_type,
      payload,
      idempotency_key,
      status: "pending",
    })
    .select()
    .single<Event>();

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to create event: ${insertError.message}` },
      { status: 500 }
    );
  }

  try {
    await deliveriesQueue.add("deliver", { eventId: event.id });
  } catch (queueError) {
    const message =
      queueError instanceof Error ? queueError.message : String(queueError);
    return NextResponse.json(
      {
        error: `Event ${event.id} was saved but failed to be queued for delivery: ${message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(event, { status: 201 });
}
