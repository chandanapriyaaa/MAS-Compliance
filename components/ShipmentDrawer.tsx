"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/app/api/shipment/[id]/logs/route";
import { StatusPill } from "./ui/StatusPill";
import { Meter } from "./ui/Meter";
import { cn } from "./ui/cn";

const STEPS = [
  { key: "intake", label: "Intake", done: "intake_complete" },
  { key: "classify", label: "HS Classification", done: "classification_complete" },
  { key: "crosscheck", label: "Scheme Cross-Check", done: "crosscheck_complete" },
  { key: "duty", label: "Duty Calculator", done: "duty_complete" },
  { key: "escalate", label: "Confidence Gate", done: "escalation_decision" },
  { key: "docgen", label: "Documentation", done: "docgen_complete" },
] as const;

interface Payload {
  shipment: {
    id: string;
    product_description: string;
    origin_country: string | null;
    dest_country: string | null;
    classification_status: string;
    current_step: string;
    error: string | null;
    created_at: string;
  };
  classification: {
    hs_code: string | null;
    confidence_score: number | null;
    aggregate_confidence: number | null;
    scheme: any;
    duty: any;
    documents: any;
    is_final: boolean;
  } | null;
  logs: LogEntry[];
}

const IN_FLIGHT = new Set(["pending", "processing"]);

export function ShipmentDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<"workflow" | "logs">("workflow");
  const dataRef = useRef<Payload | null>(null);
  dataRef.current = data;

  useEffect(() => {
    if (!id) return;
    setData(null);
    setTab("workflow");
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/api/shipment/${id}/logs`, { cache: "no-store" });
        if (alive && res.ok) setData(await res.json());
      } catch {
        /* transient */
      }
      if (!alive) return;
      const st = dataRef.current?.shipment.classification_status ?? "pending";
      timer = setTimeout(tick, IN_FLIGHT.has(st) ? 2000 : 15000);
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  // Close on Escape.
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!id) return null;

  const s = data?.shipment;
  const c = data?.classification;
  const conf = c?.aggregate_confidence ?? c?.confidence_score ?? null;
  const doneEvents = new Set((data?.logs ?? []).map((l) => l.event));
  const hasError = (data?.logs ?? []).some((l) => l.level === "error");

  return (
    <div className="fixed inset-0 z-[70]">
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      {/* panel */}
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-separator bg-canvas shadow-lg"
        style={{ animation: "slideIn 0.3s var(--spring-smooth) both" }}
      >
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* header */}
        <div className="border-b border-separator p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-label">
                {s?.product_description ?? "Loading…"}
              </div>
              <div className="mt-0.5 text-[12px] text-label-tertiary">
                {(s?.origin_country ?? "?") + " → " + (s?.dest_country ?? "?")}
                {s ? ` · ${s.id.slice(0, 8)}` : ""}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-label-secondary hover:bg-[var(--fill-quaternary)]"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {s && <StatusPill status={s.classification_status} pulse={IN_FLIGHT.has(s.classification_status)} />}
            {c?.hs_code && (
              <span className="font-mono text-[13px] text-label">{c.hs_code}</span>
            )}
            {conf != null && (
              <div className="w-40">
                <Meter value={conf} />
              </div>
            )}
          </div>

          {/* tabs */}
          <div className="mt-4 flex gap-1">
            {(["workflow", "logs"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition",
                  tab === t
                    ? "bg-[var(--fill-tertiary)] text-label"
                    : "text-label-secondary hover:bg-[var(--fill-quaternary)]",
                )}
              >
                {t === "logs" ? "Terminal logs" : "Workflow"}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!data ? (
            <div className="p-6 text-[13px] text-label-tertiary">Loading trail…</div>
          ) : tab === "workflow" ? (
            <Workflow
              logs={data.logs}
              currentStep={s!.current_step}
              status={s!.classification_status}
              doneEvents={doneEvents}
              classification={c ?? null}
            />
          ) : (
            <Terminal logs={data.logs} live={IN_FLIGHT.has(s!.classification_status)} />
          )}
        </div>

        {hasError && s?.error && (
          <div className="border-t border-separator bg-[color-mix(in_srgb,var(--red)_10%,transparent)] p-3 text-[12px] text-red-ink">
            {s.error}
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Workflow stepper ───────────────────────────────────────────
function Workflow({
  logs,
  currentStep,
  status,
  doneEvents,
  classification,
}: {
  logs: LogEntry[];
  currentStep: string;
  status: string;
  doneEvents: Set<string>;
  classification: Payload["classification"];
}) {
  const timeFor = (event: string) =>
    logs.find((l) => l.event === event)?.created_at;

  function stateOf(step: (typeof STEPS)[number]): {
    state: "done" | "active" | "pending" | "error" | "skipped";
  } {
    const stepErr = logs.some((l) => l.step === step.key && l.level === "error");
    if (stepErr) return { state: "error" };
    if (step.key === "duty" && doneEvents.has("duty_skipped") && !doneEvents.has("duty_complete"))
      return { state: "skipped" };
    if (doneEvents.has(step.done)) return { state: "done" };
    if (currentStep === step.key && IN_FLIGHT.has(status)) return { state: "active" };
    return { state: "pending" };
  }

  function detail(key: string): string | null {
    if (!classification) return null;
    if (key === "classify" && classification.hs_code)
      return `${classification.hs_code} · ${Number(classification.confidence_score ?? 0).toFixed(2)}`;
    if (key === "crosscheck" && classification.scheme) {
      const sc = classification.scheme;
      const parts = [];
      if (sc.rodtep_rate != null) parts.push(`RoDTEP ${(sc.rodtep_rate * 100).toFixed(1)}%`);
      if (sc.flags?.length) parts.push(`${sc.flags.length} flag(s)`);
      return parts.join(" · ") || null;
    }
    if (key === "duty" && classification.duty)
      return `${classification.duty.currency} ${Number(classification.duty.duty_amount).toLocaleString()}`;
    if (key === "docgen" && classification.documents?.documents)
      return `${classification.documents.documents.length} documents`;
    return null;
  }

  return (
    <ol className="relative p-5 pl-8">
      <div className="absolute bottom-6 left-[18px] top-8 w-0.5 bg-separator" />
      {STEPS.map((step) => {
        const { state } = stateOf(step);
        const t = timeFor(step.done);
        const d = detail(step.key);
        return (
          <li key={step.key} className="relative mb-6 last:mb-0">
            <span
              className={cn(
                "absolute -left-[26px] top-0.5 grid h-5 w-5 place-items-center rounded-full border-2",
                state === "done" && "border-green bg-green",
                state === "active" && "border-blue bg-blue animate-pulse",
                state === "error" && "border-red bg-red",
                state === "skipped" && "border-separator-strong bg-canvas",
                state === "pending" && "border-separator-strong bg-canvas",
              )}
            >
              {state === "done" && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12.5 4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "text-[14px] font-medium",
                  state === "pending" ? "text-label-tertiary" : "text-label",
                )}
              >
                {step.label}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-label-tertiary">
                {state === "active" ? "running" : state}
              </span>
            </div>
            {d && <div className="mt-0.5 font-mono text-[12px] text-label-secondary">{d}</div>}
            {t && (
              <div className="text-[11px] text-label-tertiary" suppressHydrationWarning>
                {new Date(t).toLocaleTimeString()}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Terminal log stream ────────────────────────────────────────
function Terminal({ logs, live }: { logs: LogEntry[]; live: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const levelColor = (l: string) =>
    l === "error" ? "text-[#ff6b6b]" : l === "warn" ? "text-[#ffd166]" : "text-[#6ee7ff]";

  return (
    <div className="m-4 rounded-lg bg-[#0b0e14] p-3 font-mono text-[12px] leading-relaxed text-slate-300">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2 text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2">pipeline · {logs.length} events {live ? "· live" : ""}</span>
      </div>
      {logs.length === 0 && <div className="text-slate-500">No events yet…</div>}
      {logs.map((l, i) => (
        <div key={l.id}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="block w-full text-left hover:bg-white/5"
          >
            <span className="text-slate-500" suppressHydrationWarning>
              {new Date(l.created_at).toLocaleTimeString()}{" "}
            </span>
            <span className="text-slate-400">{l.step}</span>{" "}
            <span className={levelColor(l.level)}>{l.event}</span>
            {l.level !== "info" && (
              <span className="ml-1 text-[10px] uppercase text-slate-500">[{l.level}]</span>
            )}
          </button>
          {open === i && Object.keys(l.data ?? {}).length > 0 && (
            <pre className="mb-1 mt-0.5 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-[11px] text-slate-400">
              {JSON.stringify(l.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
      {live && (
        <div className="mt-1 text-slate-500">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-slate-400 align-middle" /> awaiting next event
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
