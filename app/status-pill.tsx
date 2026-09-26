import type { EventStatus } from "@/lib/types";

const STYLES: Record<EventStatus, string> = {
  delivered: "bg-green-100 text-green-800",
  retrying: "bg-amber-100 text-amber-800",
  dead: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-700",
};

const LABELS: Record<EventStatus, string> = {
  delivered: "Delivered",
  retrying: "Retrying",
  dead: "Dead-lettered",
  pending: "Pending",
};

export function StatusPill({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
