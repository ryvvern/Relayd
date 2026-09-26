import type { DeliveryAttempt, Event } from "@/lib/types";
import { formatRelativeTime } from "@/lib/relative-time";
import { StatusPill } from "./status-pill";

export function LatestDelivery({
  event,
  endpointUrl,
  mostRecentAttempt,
}: {
  event: Event;
  endpointUrl: string;
  mostRecentAttempt: DeliveryAttempt | null;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-background p-4 sm:p-6">
      <h2 className="mb-4 text-sm font-medium text-muted">Latest delivery</h2>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-dark-card p-4 font-mono text-sm text-background lg:basis-1/2">
          {JSON.stringify(event.payload, null, 2)}
        </pre>

        <dl className="flex flex-1 flex-col justify-between gap-4 lg:basis-1/2">
          <div>
            <dt className="text-xs text-muted">Event type</dt>
            <dd className="font-mono text-sm text-foreground">{event.event_type}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Endpoint URL</dt>
            <dd className="break-all font-mono text-sm text-foreground">{endpointUrl}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Status</dt>
            <dd className="mt-1">
              <StatusPill status={event.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">
              {event.status === "delivered" ? "Delivered" : "Last attempted"}
            </dt>
            <dd className="font-mono text-sm text-foreground">
              {mostRecentAttempt ? formatRelativeTime(mostRecentAttempt.attempted_at) : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
