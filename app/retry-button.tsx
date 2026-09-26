"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${response.status}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRetry}
        disabled={pending}
        className="rounded-lg border border-hairline px-3 py-1.5 text-sm font-medium text-foreground disabled:opacity-50"
      >
        {pending ? "Retrying..." : "Retry"}
      </button>
      {error && <div className="mt-1 text-xs text-red-700">{error}</div>}
    </div>
  );
}
