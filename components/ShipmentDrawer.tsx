"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LogEntry } from "@/app/api/shipment/[id]/logs/route";
import { StatusPill } from "./ui/StatusPill";
import { Meter } from "./ui/Meter";
import { AgentFlow } from "./AgentFlow";
import { cn } from "./ui/cn";

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
    reasoning: string | null;
    retrieved_sources: any;
    scheme: any;
    duty: any;
    documents: any;
    is_final: boolean;
  } | null;
  logs: LogEntry[];
}

const IN_FLIGHT = new Set(["pending", "processing"]);

/** Build a one-row CSV of the finalized classification and download it. */
function exportCsv(data: Payload) {
  const s = data.shipment;
  const c = data.classification;
  const sc = c?.scheme ?? {};
  const dt = c?.duty ?? {};
  const cols: [string, string | number | null][] = [
    ["shipment_id", s.id],
    ["product", s.product_description],
    ["origin", s.origin_country],
    ["destination", s.dest_country],
    ["status", s.classification_status],
    ["hs_code", c?.hs_code ?? ""],
    ["confidence", c?.confidence_score ?? ""],
    ["aggregate_confidence", c?.aggregate_confidence ?? ""],
    ["scheme_eligible", sc.scheme_eligible ?? ""],
    ["rodtep_rate", sc.rodtep_rate ?? ""],
    ["drawback_rate", sc.drawback_rate ?? ""],
    ["duty_amount", dt.duty_amount ?? ""],
    ["currency", dt.currency ?? ""],
    ["flags", (sc.flags ?? []).join("; ")],
    ["documents", c?.documents?.documents?.length ?? 0],
    ["is_final", c?.is_final ?? false],
    ["created_at", s.created_at],
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv =
    cols.map(([k]) => esc(k)).join(",") +
    "\n" +
    cols.map(([, v]) => esc(v)).join(",") +
    "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `classification-${s.id.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a brutalist-minimal one-page analytics report in a print window; the
 * user saves it as PDF. Self-contained HTML + inline CSS (A4, muted palette,
 * mono data, thin rules).
 */
function generateReport(data: Payload) {
  const s = data.shipment;
  const c = data.classification;
  const sc = (c?.scheme ?? {}) as Record<string, any>;
  const dt = (c?.duty ?? {}) as Record<string, any>;
  const sources = (c?.retrieved_sources ?? []) as any[];
  const logs = data.logs ?? [];
  const esc = (v: unknown) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pct = (v: any) => (v == null ? "—" : `${(Number(v) * 100).toFixed(1)}%`);
  const num = (v: any) => (v == null ? "—" : Number(v).toFixed(3));
  const money = (v: any) =>
    v == null ? "—" : `${dt.currency ?? "INR"} ${Number(v).toLocaleString()}`;
  const decision =
    s.classification_status === "auto_approved" || s.classification_status === "human_approved"
      ? "APPROVED"
      : s.classification_status === "needs_review"
        ? "NEEDS REVIEW"
        : s.classification_status.toUpperCase();
  const agg = c?.aggregate_confidence ?? c?.confidence_score;

  const bar = (label: string, v: any) => {
    const w = v == null ? 0 : Math.round(Math.max(0, Math.min(1, Number(v))) * 100);
    return `<div class="bar"><div class="bl"><span>${label}</span><b>${num(v)}</b></div>
      <div class="track"><i style="width:${w}%"></i></div></div>`;
  };

  const dutyRows = (dt.breakdown ?? [])
    .map(
      (b: any) =>
        `<tr><td>${esc(b.label)}</td><td class="r">${pct(b.rate)}</td><td class="r">${money(b.amount)}</td></tr>`,
    )
    .join("");

  const srcRows = sources
    .slice(0, 6)
    .map(
      (x: any) =>
        `<tr><td class="mono">${esc(x.hs_code ?? "—")}</td><td>${esc(x.title ?? x.snippet ?? x.source)}</td><td class="r mono">${x.similarity != null ? Number(x.similarity).toFixed(2) : "—"}</td></tr>`,
    )
    .join("");

  const timeline = logs
    .map((l) => {
      const t = new Date(l.created_at).toLocaleTimeString();
      return `<div class="tl"><span class="mono">${esc(t)}</span><span class="tstep">${esc(l.step)}</span><span>${esc(l.event.replace(/_/g, " "))}</span></div>`;
    })
    .join("");

  const flags = (sc.flags ?? []) as string[];
  const generated = new Date().toLocaleString();

  const win = window.open("", "_blank", "width=880,height=1100");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Shipment analysis — ${esc(s.id.slice(0, 8))}</title>
<style>
  :root{--ink:#111;--mut:#6b6b6b;--line:#111;--soft:#e7e5e1;--acc:#0a58ff;--bg:#faf9f6}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .page{max-width:760px;margin:0 auto;padding:40px 44px}
  .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
  .ey{font:600 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
  h1{font-size:30px;letter-spacing:-.02em;margin:6px 0 2px}
  .sub{color:var(--mut);font-size:12px}
  .rule{border:0;border-top:2px solid var(--line);margin:18px 0}
  .thin{border:0;border-top:1px solid var(--soft);margin:14px 0}
  .grid{display:grid;grid-template-columns:1.2fr 1fr;gap:22px}
  .verdict{border:2px solid var(--line);padding:16px 18px}
  .verdict .d{font:800 22px/1 -apple-system,sans-serif;letter-spacing:-.01em}
  .big{font:800 46px/1 -apple-system,sans-serif;letter-spacing:-.02em}
  .kv{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--soft);font-size:12px}
  .kv b{font-weight:600}
  .sec{margin-top:22px}
  .sec h2{font:700 12px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:0 0 10px}
  .bar{margin:7px 0}
  .bl{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px}
  .track{height:8px;background:var(--soft);border:1px solid #d9d7d2}
  .track i{display:block;height:100%;background:var(--acc)}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--soft)}
  th{font:600 10px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
  td.r,th.r{text-align:right}
  .tl{display:grid;grid-template-columns:78px 92px 1fr;gap:8px;font-size:11px;padding:3px 0;border-bottom:1px dotted var(--soft)}
  .tstep{color:var(--acc);font-weight:600}
  .chips span{display:inline-block;border:1px solid var(--line);padding:2px 7px;margin:0 5px 5px 0;font:11px/1.3 ui-monospace,monospace}
  .foot{margin-top:26px;padding-top:12px;border-top:2px solid var(--line);font-size:10.5px;color:var(--mut)}
  @media print{body{background:#fff}.page{padding:24px}@page{margin:14mm}}
</style></head><body><div class="page">
  <div class="ey">Shipment Analysis · Trade Compliance Copilot</div>
  <h1>${esc(s.product_description)}</h1>
  <div class="sub">HS <span class="mono">${esc(c?.hs_code ?? "n/a")}</span> · ${esc(s.origin_country ?? "?")} → ${esc(s.dest_country ?? "?")} · <span class="mono">${esc(s.id)}</span></div>
  <hr class="rule"/>

  <div class="grid">
    <div class="verdict">
      <div class="ey">Decision</div>
      <div class="d">${decision}</div>
      <div style="margin-top:10px" class="ey">Aggregate confidence</div>
      <div class="big" style="color:${agg != null && Number(agg) >= 0.85 ? "#127a3d" : "#b25e00"}">${num(agg)}</div>
      <div class="sub">threshold 0.85</div>
    </div>
    <div>
      <div class="kv"><span>HS classification</span><b class="mono">${num(c?.confidence_score)}</b></div>
      <div class="kv"><span>Scheme eligible</span><b>${sc.scheme_eligible ? "Yes" : "No"}</b></div>
      <div class="kv"><span>RoDTEP</span><b class="mono">${pct(sc.rodtep_rate)}</b></div>
      <div class="kv"><span>Drawback</span><b class="mono">${pct(sc.drawback_rate)}</b></div>
      <div class="kv"><span>Duty payable</span><b class="mono">${money(dt.duty_amount)}</b></div>
      <div class="kv"><span>Documents</span><b>${c?.documents?.documents?.length ?? 0}</b></div>
    </div>
  </div>

  <div class="sec">
    <h2>Confidence signals</h2>
    ${bar("HS classification", c?.confidence_score)}
    ${bar("Scheme cross-check", sc.confidence)}
    ${bar("Duty computation", dt.confidence)}
  </div>

  ${
    dutyRows
      ? `<div class="sec"><h2>Duty breakdown</h2><table><thead><tr><th>Component</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${dutyRows}<tr><td><b>Total</b></td><td class="r mono">${pct(dt.duty_rate)}</td><td class="r mono"><b>${money(dt.duty_amount)}</b></td></tr></tbody></table></div>`
      : ""
  }

  ${
    srcRows
      ? `<div class="sec"><h2>Cited sources — ${sources.length} retrieved</h2><table><thead><tr><th>HS</th><th>Source</th><th class="r">Sim</th></tr></thead><tbody>${srcRows}</tbody></table></div>`
      : ""
  }

  ${flags.length ? `<div class="sec"><h2>Flags</h2><div class="chips">${flags.map((f) => `<span>${esc(f.split(":")[0])}</span>`).join("")}</div></div>` : ""}

  <div class="sec"><h2>Pipeline timeline</h2>${timeline || '<div class="sub">No events.</div>'}</div>

  <div class="foot">
    Machine-generated draft analysis. Verify HS code, scheme eligibility, and duty against current DGFT/CBIC notifications before filing.<br/>
    Generated ${esc(generated)} · Trade Compliance Copilot · Designed &amp; developed by Korada Chandana Priya
  </div>
</div></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

export function ShipmentDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<"workflow" | "documents" | "logs">("workflow");
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

  // ── draggable floating window ──
  const winRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ mx: number; my: number; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!id) {
      setPos(null);
      return;
    }
    const w = Math.min(window.innerWidth * 0.94, 600);
    setPos({
      x: Math.max(12, (window.innerWidth - w) / 2),
      y: Math.max(78, Math.round(window.innerHeight * 0.08)),
    });
  }, [id]);

  function onDragDown(e: React.PointerEvent) {
    if (!pos) return;
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const el = winRef.current;
    const w = el?.offsetWidth ?? 560;
    let x = dragRef.current.x + (e.clientX - dragRef.current.mx);
    let y = dragRef.current.y + (e.clientY - dragRef.current.my);
    x = Math.min(Math.max(-w + 120, x), window.innerWidth - 120);
    y = Math.min(Math.max(8, y), window.innerHeight - 52);
    setPos({ x, y });
  }
  function onDragUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  if (!id) return null;

  const s = data?.shipment;
  const c = data?.classification;
  const conf = c?.aggregate_confidence ?? c?.confidence_score ?? null;
  const hasError = (data?.logs ?? []).some((l) => l.level === "error");

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* draggable floating window — overlays the dashboard, movable anywhere */}
      <aside
        ref={winRef}
        className="pointer-events-auto absolute flex max-h-[84vh] w-[min(94vw,600px)] flex-col overflow-hidden rounded-2xl border border-separator bg-canvas shadow-lg"
        style={{
          left: pos ? pos.x : "50%",
          top: pos ? pos.y : 80,
          transform: pos ? undefined : "translateX(-50%)",
          animation: "popIn 0.24s var(--spring-smooth) both",
        }}
      >
        <style>{`@keyframes popIn{from{transform:translateY(8px) scale(0.985);opacity:0}to{opacity:1}}`}</style>

        {/* header = drag handle */}
        <div
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          className="shrink-0 cursor-move touch-none select-none border-b border-separator p-5 pt-3"
        >
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-[var(--fill)]" title="Drag to move" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold text-label">
                {s?.product_description ?? "Loading…"}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-label-tertiary">
                {(s?.origin_country ?? "?") + " → " + (s?.dest_country ?? "?")}
                {s ? ` · ${s.id.slice(0, 8)}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {data && (
                <>
                  <button
                    onClick={() => generateReport(data)}
                    className="rounded-full bg-blue px-3 py-1.5 text-[12px] font-medium text-white transition hover:brightness-110"
                    title="Open a one-page analytics report (print or save as PDF)"
                  >
                    Report
                  </button>
                  <button
                    onClick={() => exportCsv(data)}
                    className="hidden rounded-full border border-separator px-3 py-1.5 text-[12px] font-medium text-label-secondary transition hover:bg-[var(--fill-quaternary)] hover:text-label sm:block"
                    title="Export classification as CSV"
                  >
                    CSV
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full text-label-secondary transition hover:bg-[var(--fill-quaternary)]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
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
          <div className="mt-4 flex flex-wrap gap-1">
            {(["workflow", "documents", "logs"] as const).map((t) => {
              const label =
                t === "logs" ? "Terminal logs" : t === "documents" ? "Documents" : "Workflow";
              const docCount = data?.classification?.documents?.documents?.length ?? 0;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
                    tab === t
                      ? "bg-[var(--fill-tertiary)] text-label"
                      : "text-label-secondary hover:bg-[var(--fill-quaternary)]",
                  )}
                >
                  {label}
                  {t === "documents" && docCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-blue px-1.5 py-0.5 text-[10px] text-white">
                      {docCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {!data ? (
            <div className="p-6 text-[13px] text-label-tertiary">Loading trail…</div>
          ) : tab === "documents" ? (
            <Documents data={data} />
          ) : tab === "workflow" ? (
            <AgentFlow
              logs={data.logs}
              currentStep={s!.current_step}
              status={s!.classification_status}
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

// ── Generated documents ────────────────────────────────────────
interface DraftDoc {
  type: string;
  title: string;
  body: string;
}

function Documents({ data }: { data: Payload }) {
  const docs = (data.classification?.documents?.documents ?? []) as DraftDoc[];
  const disclaimer = data.classification?.documents?.disclaimer as string | undefined;

  if (!data.classification?.is_final) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--fill-tertiary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M7 3h7l4 4v14H7V3ZM14 3v4h4" stroke="var(--label-tertiary)" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3 text-[14px] font-medium text-label">No documents yet</p>
        <p className="mt-1 text-[12px] text-label-tertiary">
          Documents are drafted only after the classification is finalized
          (auto-approved or human-approved).
        </p>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="p-6 text-[13px] text-label-tertiary">
        Finalized, but no documents were generated.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-label-tertiary">
          {docs.length} draft{docs.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => printDocuments(data, docs, disclaimer)}
          className="rounded-full bg-blue px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:brightness-110"
        >
          Print / Save as PDF
        </button>
      </div>

      {docs.map((d, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-separator">
          <div className="flex items-center justify-between border-b border-separator bg-surface px-4 py-2.5">
            <span className="text-[13px] font-semibold text-label">{d.title}</span>
            <div className="flex gap-1">
              <button
                onClick={() => navigator.clipboard?.writeText(d.body)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-label-secondary transition hover:bg-[var(--fill-quaternary)]"
              >
                Copy
              </button>
              <button
                onClick={() => downloadText(`${d.type}.txt`, d.body)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-label-secondary transition hover:bg-[var(--fill-quaternary)]"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[12px] leading-relaxed text-label-secondary">
            {d.body}
          </pre>
        </div>
      ))}

      {disclaimer && (
        <p className="rounded-lg border border-amber-200/60 bg-[color-mix(in_srgb,var(--amber)_10%,transparent)] p-3 text-[12px] leading-relaxed text-amber-ink">
          {disclaimer}
        </p>
      )}
    </div>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a clean print window with the documents; user saves as PDF. */
function printDocuments(data: Payload, docs: DraftDoc[], disclaimer?: string) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const s = data.shipment;
  const c = data.classification;
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Export documents — ${esc(s.id.slice(0, 8))}</title>
    <style>
      body{font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:40px;max-width:720px}
      h1{font-size:18px;margin:0 0 4px} .meta{color:#666;font-size:12px;margin-bottom:24px}
      .doc{margin:26px 0;page-break-inside:avoid}
      .doc h2{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:6px;margin:0 0 10px}
      pre{white-space:pre-wrap;word-break:break-word;font:12px/1.6 ui-monospace,Menlo,monospace}
      .disc{margin-top:28px;padding:12px;border:1px solid #e6c200;background:#fff8e1;border-radius:8px;font-size:12px;color:#7a5b00}
      @media print{body{margin:24px}}
    </style></head><body>
    <h1>Trade Compliance Copilot — Export</h1>
    <div class="meta">${esc(s.product_description)} · HS ${esc(c?.hs_code ?? "n/a")} · ${esc(
      s.origin_country ?? "?",
    )} → ${esc(s.dest_country ?? "?")} · ${esc(s.id)}</div>
    ${docs
      .map((d) => `<div class="doc"><h2>${esc(d.title)}</h2><pre>${esc(d.body)}</pre></div>`)
      .join("")}
    ${disclaimer ? `<div class="disc">${esc(disclaimer)}</div>` : ""}
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
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
