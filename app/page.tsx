import { supabase } from "@/lib/supabase";
import type { DeliveryAttempt, Endpoint, Event, EventStatus } from "@/lib/types";
import { RetryButton } from "./retry-button";
import { AutoRefresh } from "./auto-refresh";

async function getData() {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select()
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  if (eventsError) {
    throw new Error(`Failed to load events: ${eventsError.message}`);
  }

  const { data: endpoints, error: endpointsError } = await supabase
    .from("endpoints")
    .select()
    .returns<Endpoint[]>();

  if (endpointsError) {
    throw new Error(`Failed to load endpoints: ${endpointsError.message}`);
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from("delivery_attempts")
    .select()
    .returns<DeliveryAttempt[]>();

  if (attemptsError) {
    throw new Error(`Failed to load delivery attempts: ${attemptsError.message}`);
  }

  return { events: events ?? [], endpoints: endpoints ?? [], attempts: attempts ?? [] };
}

export default async function Home() {
  const { events, endpoints, attempts } = await getData();

  const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));

  const statusCounts: Record<EventStatus, number> = {
    pending: 0,
    delivered: 0,
    retrying: 0,
    dead: 0,
  };
  for (const event of events) {
    statusCounts[event.status] += 1;
  }

  return (
    <div>
      <AutoRefresh />
      <h1>Events</h1>

      <ul>
        <li>Delivered: {statusCounts.delivered}</li>
        <li>Retrying: {statusCounts.retrying}</li>
        <li>Pending: {statusCounts.pending}</li>
        <li>Dead: {statusCounts.dead}</li>
      </ul>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Endpoint URL</th>
            <th>Status</th>
            <th>Attempt Count</th>
            <th>Most Recent Attempt</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const endpoint = endpointById.get(event.endpoint_id);
            const eventAttempts = attempts.filter((a) => a.event_id === event.id);
            const mostRecentAttempt = eventAttempts.reduce<DeliveryAttempt | null>(
              (latest, attempt) =>
                !latest || attempt.attempted_at > latest.attempted_at ? attempt : latest,
              null
            );

            return (
              <tr key={event.id}>
                <td>{event.event_type}</td>
                <td>{endpoint?.url ?? "(unknown)"}</td>
                <td>{event.status}</td>
                <td>{eventAttempts.length}</td>
                <td>{mostRecentAttempt ? mostRecentAttempt.attempted_at : "—"}</td>
                <td>
                  {event.status !== "delivered" && <RetryButton eventId={event.id} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
