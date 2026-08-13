"use client";

import { useEffect, useRef, useState } from "react";
import type { ShipmentRow } from "@/app/api/shipments/route";
import { StatusPill } from "./ui/StatusPill";
import { Meter } from "./ui/Meter";
import { Card } from "./ui/Card";
import { ShipmentDrawer } from "./ShipmentDrawer";

const IN_FLIGHT = new Set(["pending", "processing"]);

/**
 * Live shipments table. Seeded server-side, then polls /api/shipments while any
 * row is in flight — progress animates in without a manual refresh. Polling
 * slows to a quiet heartbeat once everything has settled.
 */
export function ShipmentsTable({
  initial,
  threshold,
}: {
  initial: ShipmentRow[];
  threshold: number;
}) {
  const [rows, setRows] = useState<ShipmentRow[]>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch("/api/shipments", { cache: "no-store" });
        if (alive && res.ok) {
          const json = (await res.json()) as { rows: ShipmentRow[] };
          setRows(json.rows);
        }
      } catch {
        /* transient */
      }
      if (!alive) return;
      const inFlight = rowsRef.current.some((r) => IN_FLIGHT.has(r.status));
      timer = setTimeout(tick, inFlight ? 2500 : 9000);
    }

    timer = setTimeout(tick, 2500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[15px] text-label-secondary">No shipments yet.</p>
        <p className="mt-1 text-[13px] text-label-tertiary">
          Submit one to start the pipeline.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-separator text-[12px] uppercase tracking-wide text-label-tertiary">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Route</th>
              <th className="px-5 py-3 font-medium">HS code</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Confidence</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r.id)}
                className="cursor-pointer border-b border-separator/60 transition-colors last:border-0 hover:bg-[var(--fill-quaternary)]"
              >
                <td className="max-w-[22rem] px-5 py-3.5">
                  <div className="truncate font-medium text-label" title={r.product_description}>
                    {r.product_description}
                  </div>
                  <div
                    className="text-[12px] text-label-tertiary"
                    suppressHydrationWarning
                  >
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3.5 text-label-secondary md:table-cell">
                  {(r.origin_country ?? "?") + " → " + (r.dest_country ?? "?")}
                </td>
                <td className="px-5 py-3.5 font-mono text-[13px] text-label">
                  {r.hs_code ?? "n/a"}
                </td>
                <td className="hidden w-48 px-5 py-3.5 sm:table-cell">
                  <Meter value={r.confidence} threshold={threshold} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={r.status} pulse={IN_FLIGHT.has(r.status)} />
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="shrink-0 text-label-tertiary"
                      aria-hidden
                    >
                      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ShipmentDrawer id={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
