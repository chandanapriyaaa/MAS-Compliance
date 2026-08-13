"use client";

import { useEffect, useState } from "react";
import type { AuditRow } from "@/app/api/audit/route";
import { Card } from "./ui/Card";
import { cn } from "./ui/cn";

const LEVELS = ["all", "info", "warn", "error"] as const;

/** Org-wide audit log search. Debounced query + level filter, live results. */
export function AuditSearch() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (level !== "all") params.set("level", level);
      try {
        const res = await fetch(`/api/audit?${params.toString()}`, { cache: "no-store" });
        if (alive && res.ok) setRows((await res.json()).rows);
      } catch {
        /* transient */
      } finally {
        if (alive) setLoading(false);
      }
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, level]);

  const levelColor = (l: string) =>
    l === "error"
      ? "text-red-ink bg-[color-mix(in_srgb,var(--red)_12%,transparent)]"
      : l === "warn"
        ? "text-amber-ink bg-[color-mix(in_srgb,var(--amber)_16%,transparent)]"
        : "text-blue-ink bg-[color-mix(in_srgb,var(--blue)_10%,transparent)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events or steps (e.g. escalation, duty, classification)"
            className="w-full rounded-full border border-separator bg-canvas py-2.5 pl-9 pr-3 text-[14px] text-label placeholder:text-[var(--placeholder)] focus:border-blue focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--blue)_16%,transparent)]"
          />
        </div>
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition",
                level === l ? "bg-[var(--fill-tertiary)] text-label" : "text-label-secondary hover:bg-[var(--fill-quaternary)]",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[62vh] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-elevated">
              <tr className="border-b border-separator text-[11px] uppercase tracking-wide text-label-tertiary">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Step</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Shipment</th>
                <th className="px-4 py-2.5 font-medium">Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="cursor-pointer border-b border-separator/60 align-top transition-colors last:border-0 hover:bg-[var(--fill-quaternary)]"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-label-tertiary" suppressHydrationWarning>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-label-secondary">{r.step}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-label">{r.event}</span>
                    {open === r.id && Object.keys(r.data ?? {}).length > 0 && (
                      <pre className="mt-1.5 max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded bg-[var(--fill-tertiary)] p-2 text-[11px] text-label-secondary">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    )}
                  </td>
                  <td className="hidden max-w-[16rem] truncate px-4 py-2.5 text-label-secondary md:table-cell" title={r.product ?? ""}>
                    {r.product ?? (r.shipment_id ? r.shipment_id.slice(0, 8) : "—")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", levelColor(r.level))}>
                      {r.level}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-label-tertiary">
                    {loading ? "Searching…" : "No matching events."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[12px] text-label-tertiary">
        {rows.length} event{rows.length === 1 ? "" : "s"} · newest first · click a row for its payload
      </p>
    </div>
  );
}
