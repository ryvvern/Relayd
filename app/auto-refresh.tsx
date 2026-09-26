"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Subscribes to Realtime changes on the events and delivery_attempts tables
// so the dashboard updates instantly instead of on a polling delay. See
// https://supabase.com/docs/guides/realtime/postgres-changes for the
// documented client pattern this follows.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("events-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_attempts" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [router]);

  return null;
}
