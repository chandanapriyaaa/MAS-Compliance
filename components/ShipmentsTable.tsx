"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShipmentRow } from "@/app/api/shipments/route";
import { StatusPill } from "./ui/StatusPill";
import { Meter } from "./ui/Meter";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { ShipmentDrawer } from "./ShipmentDrawer";
import { NewShipmentForm } from "./NewShipmentForm";
import { cn } from "./ui/cn";

const IN_FLIGHT = new Set(["pending", "processing"]);

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "inflight", label: "In flight", match: (s) => IN_FLIGHT.has(s) },
  {
    key: "approved",
    label: "Approved",
    match: (s) => s === "auto_approved" || s === "human_approved",
  },
  { key: "review", label: "Needs review", match: (s) => s === "needs_review" },
  { key: "failed", label: "Failed", match: (s) => s === "failed" || s === "rejected" },
];

/**
 * Full-width live shipments table. Columns are fixed-width + truncating so the
 * table never needs horizontal scrolling; low-priority columns drop out on
 * narrow screens. Toolbar adds search, a status filter, and the intake modal.
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return rows.filter((r) => {
      if (!f.match(r.status)) return false;
      if (!q) return true;
      return (
        r.product_description.toLowerCase().includes(q) ||
        (r.hs_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product or HS code"
              className="w-full rounded-full border border-separator bg-canvas py-2 pl-9 pr-3 text-[13px] text-label placeholder:text-[var(--placeholder)] focus:border-blue focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--blue)_16%,transparent)]"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition",
                  filter === f.key
                    ? "bg-[var(--fill-tertiary)] text-label"
                    : "text-label-secondary hover:bg-[var(--fill-quaternary)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="shrink-0">
          + New shipment
        </Button>
      </div>

      {/* table */}
      {visible.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[15px] text-label-secondary">
            {rows.length === 0 ? "No shipments yet." : "No matches."}
          </p>
          <p className="mt-1 text-[13px] text-label-tertiary">
            {rows.length === 0 ? "Create one to start the pipeline." : "Try a different search or filter."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full table-fixed text-left text-[14px]">
            <colgroup>
              <col />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[170px]" />
              <col className="w-[160px]" />
            </colgroup>
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
              {visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className="cursor-pointer border-b border-separator/60 transition-colors last:border-0 hover:bg-[var(--fill-quaternary)]"
                >
                  <td className="px-5 py-3.5">
                    <div className="truncate font-medium text-label" title={r.product_description}>
                      {r.product_description}
                    </div>
                    <div className="truncate text-[12px] text-label-tertiary" suppressHydrationWarning>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="hidden truncate px-5 py-3.5 text-label-secondary md:table-cell">
                    {(r.origin_country ?? "?") + " → " + (r.dest_country ?? "?")}
                  </td>
                  <td className="truncate px-5 py-3.5 font-mono text-[13px] text-label">
                    {r.hs_code ?? "n/a"}
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <Meter value={r.confidence} threshold={threshold} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill status={r.status} pulse={IN_FLIGHT.has(r.status)} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-label-tertiary" aria-hidden>
                        <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ShipmentDrawer id={selected} onClose={() => setSelected(null)} />
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New shipment">
        <NewShipmentForm onSuccess={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
