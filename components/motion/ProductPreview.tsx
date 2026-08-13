import { Meter } from "../ui/Meter";
import { StatusPill } from "../ui/StatusPill";

/**
 * A faithful in-browser preview of the real dashboard, composed from the same
 * primitives the app uses (StatusPill, Meter) inside a macOS-style window frame.
 * It's the actual product surface, not an abstract placeholder.
 */
const ROWS = [
  { p: "Knitted cotton t-shirts", hs: "61091000", c: 0.88, s: "auto_approved" },
  { p: "Basmati rice, 25kg bags", hs: "10063020", c: 0.7, s: "needs_review" },
  { p: "Laptop power adapter 65W", hs: "85044030", c: 0.94, s: "auto_approved" },
  { p: "Hand-knotted wool rug", hs: "n/a", c: null, s: "processing" },
];

export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-separator bg-elevated shadow-lg">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-separator bg-surface px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex items-center gap-2 rounded-md bg-[var(--fill-tertiary)] px-3 py-1 text-[11px] text-label-tertiary">
          <span className="h-2.5 w-2.5 rounded-full border border-label-tertiary" />
          copilot.trade / dashboard / shipments
        </div>
      </div>

      {/* mini shipments table */}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-label">Shipments</span>
          <span className="rounded-full bg-[var(--fill-tertiary)] px-2 py-0.5 text-[11px] text-label-secondary">
            live
          </span>
        </div>
        <div className="space-y-1">
          {ROWS.map((r) => (
            <div
              key={r.p}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md px-2 py-2.5 hover:bg-[var(--fill-quaternary)] sm:grid-cols-[1.4fr_0.8fr_1fr_auto]"
            >
              <span className="truncate text-[13px] font-medium text-label">
                {r.p}
              </span>
              <span className="hidden font-mono text-[12px] text-label-secondary sm:block">
                {r.hs}
              </span>
              <div className="hidden sm:block">
                <Meter value={r.c} showValue={false} />
              </div>
              <StatusPill status={r.s} pulse={r.s === "processing"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
