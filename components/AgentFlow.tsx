"use client";

import type { LogEntry } from "@/app/api/shipment/[id]/logs/route";
import { cn } from "./ui/cn";

/**
 * Live agent-run visualization. Renders the six agents as a connected flow;
 * the connector between a finished agent and the running one animates a
 * travelling "packet", the active agent pulses with a working spinner, and each
 * card surfaces its live result. Reads the audit log, so it reflects the actual
 * run as events land (the drawer polls while in flight).
 */
const AGENTS = [
  { key: "intake", label: "Intake", done: "intake_complete", sub: "parse product", glyph: "M4 7h16M4 12h16M4 17h10" },
  { key: "classify", label: "Classify", done: "classification_complete", sub: "RAG + confidence", glyph: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 21l-4.3-4.3" },
  { key: "crosscheck", label: "Cross-check", done: "crosscheck_complete", sub: "DGFT schemes", glyph: "M5 12l4 4 10-10" },
  { key: "duty", label: "Duty", done: "duty_complete", sub: "BCD·SWS·IGST", glyph: "M6 3h12v18l-6-3-6 3V3Z" },
  { key: "escalate", label: "Gate", done: "escalation_decision", sub: "threshold", glyph: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" },
  { key: "docgen", label: "Docs", done: "docgen_complete", sub: "invoice·LC", glyph: "M7 3h7l4 4v14H7V3ZM14 3v4h4" },
] as const;

type State = "done" | "active" | "pending" | "error" | "skipped";

export function AgentFlow({
  logs,
  currentStep,
  status,
  classification,
}: {
  logs: LogEntry[];
  currentStep: string;
  status: string;
  classification: any;
}) {
  const doneEvents = new Set(logs.map((l) => l.event));
  const inFlight = status === "pending" || status === "processing";

  function stateOf(a: (typeof AGENTS)[number]): State {
    if (logs.some((l) => l.step === a.key && l.level === "error")) return "error";
    if (a.key === "duty" && doneEvents.has("duty_skipped") && !doneEvents.has("duty_complete"))
      return "skipped";
    if (doneEvents.has(a.done)) return "done";
    if (currentStep === a.key && inFlight) return "active";
    return "pending";
  }

  function detail(key: string): string | null {
    const c = classification;
    if (!c) return null;
    if (key === "classify" && c.hs_code) return `${c.hs_code}`;
    if (key === "crosscheck" && c.scheme) {
      if (c.scheme.rodtep_rate != null) return `RoDTEP ${(c.scheme.rodtep_rate * 100).toFixed(1)}%`;
      return c.scheme.scheme_eligible ? "eligible" : "n/a";
    }
    if (key === "duty" && c.duty) return `${c.duty.currency} ${Number(c.duty.duty_amount).toLocaleString()}`;
    if (key === "escalate" && c.aggregate_confidence != null) return `agg ${Number(c.aggregate_confidence).toFixed(2)}`;
    if (key === "docgen" && c.documents?.documents) return `${c.documents.documents.length} docs`;
    return null;
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-2 text-[12px] text-label-tertiary">
        <span className={cn("h-2 w-2 rounded-full", inFlight ? "bg-blue animate-pulse" : "bg-green")} />
        {inFlight ? `Running · ${currentStep}` : "Run complete"}
      </div>

      <ol className="space-y-0">
        {AGENTS.map((a, i) => {
          const st = stateOf(a);
          const d = detail(a.key);
          const nextActive = i < AGENTS.length - 1 && stateOf(AGENTS[i + 1]) === "active";
          const connectorFlowing = st === "done" && nextActive;
          const connectorDone = st === "done" && !nextActive && i < AGENTS.length - 1 && stateOf(AGENTS[i + 1]) !== "pending";
          return (
            <li key={a.key}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-all duration-500",
                  st === "active" && "border-blue bg-[color-mix(in_srgb,var(--blue)_7%,transparent)] shadow-sm",
                  st === "done" && "border-separator bg-elevated",
                  st === "error" && "border-red bg-[color-mix(in_srgb,var(--red)_8%,transparent)]",
                  (st === "pending" || st === "skipped") && "border-separator/60 bg-canvas opacity-70",
                )}
              >
                {/* node */}
                <div className="relative grid h-10 w-10 shrink-0 place-items-center">
                  {st === "active" && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-blue/30" />
                  )}
                  <span
                    className={cn(
                      "relative grid h-10 w-10 place-items-center rounded-full",
                      st === "done" && "bg-green text-white",
                      st === "active" && "bg-blue text-white",
                      st === "error" && "bg-red text-white",
                      (st === "pending" || st === "skipped") && "bg-[var(--fill-tertiary)] text-label-tertiary",
                    )}
                  >
                    {st === "done" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : st === "active" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
                        <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d={a.glyph} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </div>

                {/* text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("text-[14px] font-semibold", st === "pending" ? "text-label-tertiary" : "text-label")}>
                      {a.label}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-label-tertiary">
                      {st === "active" ? "running" : st}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] text-label-tertiary">{a.sub}</span>
                    {d && <span className="truncate font-mono text-[12px] text-label-secondary">{d}</span>}
                  </div>
                </div>
              </div>

              {/* connector */}
              {i < AGENTS.length - 1 && (
                <div className="ml-8 flex h-5 items-center">
                  <div className="relative h-full w-0.5 overflow-hidden rounded bg-separator">
                    {(connectorDone || connectorFlowing) && (
                      <span
                        className={cn(
                          "absolute inset-x-0 top-0 rounded bg-gradient-to-b from-green to-blue",
                          connectorFlowing ? "h-1/2 animate-[flow_1s_ease-in-out_infinite]" : "h-full",
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* citations — the RAG sources the classifier grounded its answer in */}
      {Array.isArray(classification?.retrieved_sources) &&
        classification.retrieved_sources.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Cited sources
              <span className="font-normal text-label-tertiary">
                · {classification.retrieved_sources.length} retrieved
              </span>
            </div>
            <ul className="space-y-1.5">
              {classification.retrieved_sources.slice(0, 6).map((src: any, i: number) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-separator/70 bg-canvas px-3 py-2 transition-colors hover:bg-[var(--fill-quaternary)]"
                >
                  <span className="font-mono text-[12px] font-semibold text-label">
                    {src.hs_code ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-label-secondary" title={src.title ?? ""}>
                    {src.title ?? src.snippet ?? src.source}
                  </span>
                  {typeof src.similarity === "number" && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]"
                      style={{
                        background: "color-mix(in srgb, var(--blue) 12%, transparent)",
                        color: "var(--blue-ink)",
                      }}
                    >
                      {src.similarity.toFixed(2)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-label-tertiary">
              Confidence is derived from these retrieval scores and agreement across samples.
            </p>
          </div>
        )}

      <style>{`@keyframes flow{0%{transform:translateY(-120%)}100%{transform:translateY(220%)}}`}</style>
    </div>
  );
}
