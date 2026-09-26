import { supabase } from "@/lib/supabase";
import type { DeliveryAttempt, Endpoint, Event, EventStatus } from "@/lib/types";
import { RetryButton } from "./retry-button";
import { AutoRefresh } from "./auto-refresh";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { LatestDelivery } from "./latest-delivery";
import { StatsStrip } from "./stats-strip";
import { StatusPill } from "./status-pill";
import { formatRelativeTime } from "@/lib/relative-time";

export const dynamic = "force-dynamic";

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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const deliveredToday = events.filter(
    (event) => event.status === "delivered" && new Date(event.created_at) >= startOfToday
  ).length;

  const finishedCount = statusCounts.delivered + statusCounts.dead;
  const successRate =
    finishedCount === 0 ? null : Math.round((statusCounts.delivered / finishedCount) * 100);

  const latestEvent = events[0] ?? null;
  const latestEventAttempts = latestEvent
    ? attempts.filter((a) => a.event_id === latestEvent.id)
    : [];
  const latestEventMostRecentAttempt = latestEventAttempts.reduce<DeliveryAttempt | null>(
    (latest, attempt) =>
      !latest || attempt.attempted_at > latest.attempted_at ? attempt : latest,
    null
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AutoRefresh />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Events</h1>
            <p className="text-sm text-muted">
              Every event ingested for this project and its delivery status.
            </p>
          </div>

          {latestEvent && (
            <LatestDelivery
              event={latestEvent}
              endpointUrl={endpointById.get(latestEvent.endpoint_id)?.url ?? "(unknown)"}
              mostRecentAttempt={latestEventMostRecentAttempt}
            />
          )}

          <StatsStrip
            deliveredToday={deliveredToday}
            retrying={statusCounts.retrying}
            dead={statusCounts.dead}
            successRate={successRate}
          />

          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Endpoint URL</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Most Recent Attempt</th>
                  <th className="px-4 py-3 font-medium">Action</th>
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
                    <tr key={event.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-3 font-mono text-foreground">
                        {event.event_type}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-muted">
                        {endpoint?.url ?? "(unknown)"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={event.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        {eventAttempts.length}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted">
                        {mostRecentAttempt
                          ? formatRelativeTime(mostRecentAttempt.attempted_at)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {event.status !== "delivered" && <RetryButton eventId={event.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
