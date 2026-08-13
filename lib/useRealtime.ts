"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "./supabase";

/**
 * Subscribe to Postgres changes on the given tables and invoke `onChange` on
 * any insert/update/delete. Degrades gracefully: if the browser Supabase env is
 * not configured, it simply does nothing and callers fall back to polling.
 *
 * An optional `filter` (applied to every listed table, so each must have that
 * column) scopes the subscription, e.g. `{ column: "shipment_id", value: id }`.
 */
export function useRealtime(
  tables: string[],
  onChange: () => void,
  filter?: { column: string; value: string } | null,
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  const key = tables.join(",");
  const fCol = filter?.column ?? "";
  const fVal = filter?.value ?? "";

  useEffect(() => {
    let client;
    try {
      client = supabaseBrowser();
    } catch {
      return; // env not set — polling fallback covers it
    }
    const channel = client.channel(`rt:${key}:${fVal}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table,
          ...(fCol && fVal ? { filter: `${fCol}=eq.${fVal}` } : {}),
        },
        () => cb.current(),
      );
    }
    channel.subscribe();
    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fCol, fVal]);
}
