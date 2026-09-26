import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deliveriesQueue } from "@/lib/redis";
import type { Event } from "@/lib/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select()
    .eq("id", id)
    .maybeSingle<Event>();

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to look up event: ${fetchError.message}` },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json(
      { error: `No event found with id: ${id}` },
      { status: 404 }
    );
  }

  if (event.status === "delivered") {
    return NextResponse.json(
      { error: "Event is already delivered; it cannot be retried." },
      { status: 400 }
    );
  }

  const { data: updatedEvent, error: updateError } = await supabase
    .from("events")
    .update({ status: "pending" })
    .eq("id", id)
    .select()
    .single<Event>();

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to reset event status: ${updateError.message}` },
      { status: 500 }
    );
  }

  try {
    await deliveriesQueue.add("deliver", { eventId: id });
  } catch (queueError) {
    const message =
      queueError instanceof Error ? queueError.message : String(queueError);
    return NextResponse.json(
      {
        error: `Event ${id} status was reset but failed to be queued for delivery: ${message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedEvent, { status: 200 });
}
