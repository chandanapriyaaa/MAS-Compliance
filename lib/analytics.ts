import type { AnalyticsData } from "@/components/Analytics";

interface ShipmentLite {
  classification_status: string;
  created_at: string;
}
interface ClassificationLite {
  hs_code: string | null;
  confidence_score: number | null;
  aggregate_confidence: number | null;
  scheme: any;
}

const CLEARED = new Set(["auto_approved", "human_approved"]);
const INFLIGHT = new Set(["pending", "processing"]);

/** Aggregate shipments + classifications into the dashboard analytics shape. */
export function buildAnalytics(
  shipments: ShipmentLite[],
  classifications: ClassificationLite[],
  now: Date,
): AnalyticsData {
  // ── status → donut ──
  let cleared = 0;
  let review = 0;
  let inflight = 0;
  let failed = 0;
  for (const s of shipments) {
    const st = s.classification_status;
    if (CLEARED.has(st)) cleared++;
    else if (st === "needs_review") review++;
    else if (INFLIGHT.has(st)) inflight++;
    else failed++; // failed / rejected
  }
  const decided = cleared + review + failed;
  const autoRatePct = decided ? Math.round((cleared / decided) * 100) : 0;

  const statusSlices = [
    { label: "Auto-approved", value: cleared, color: "var(--green)" },
    { label: "Needs review", value: review, color: "var(--amber)" },
    { label: "In flight", value: inflight, color: "var(--blue)" },
    { label: "Failed", value: failed, color: "var(--red)" },
  ].filter((s) => s.value > 0);

  // ── confidence histogram ──
  const bins = [
    { label: "<.5", lo: 0, hi: 0.5 },
    { label: ".5", lo: 0.5, hi: 0.6 },
    { label: ".6", lo: 0.6, hi: 0.7 },
    { label: ".7", lo: 0.7, hi: 0.8 },
    { label: ".8", lo: 0.8, hi: 0.9 },
    { label: ".9", lo: 0.9, hi: 1.01 },
  ];
  const confBuckets = bins.map((b) => ({ label: b.label, value: 0 }));
  const confs: number[] = [];
  for (const c of classifications) {
    const v = c.aggregate_confidence ?? c.confidence_score;
    if (v == null) continue;
    const n = Number(v);
    confs.push(n);
    const idx = bins.findIndex((b) => n >= b.lo && n < b.hi);
    if (idx >= 0) confBuckets[idx].value++;
  }
  const avgConfidence = confs.length
    ? confs.reduce((a, b) => a + b, 0) / confs.length
    : null;

  // ── throughput (last 12 days) ──
  const days = 12;
  const throughput: number[] = new Array(days).fill(0);
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const keyIndex = new Map(dayKeys.map((k, i) => [k, i]));
  for (const s of shipments) {
    const k = s.created_at.slice(0, 10);
    const i = keyIndex.get(k);
    if (i != null) throughput[i]++;
  }
  const throughputLabels = [dayKeys[0].slice(5), dayKeys[dayKeys.length - 1].slice(5)];

  // ── top HS chapters (2-digit) ──
  const chapterCount = new Map<string, number>();
  for (const c of classifications) {
    const digits = (c.hs_code ?? "").replace(/\D/g, "");
    if (digits.length < 2) continue;
    const ch = digits.slice(0, 2);
    chapterCount.set(ch, (chapterCount.get(ch) ?? 0) + 1);
  }
  const topChapters = [...chapterCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ch, value]) => ({ label: `Ch. ${ch}`, value }));

  // ── scheme eligibility ──
  let schemeEligible = 0;
  let schemeFlagged = 0;
  for (const c of classifications) {
    if (c.scheme?.scheme_eligible) schemeEligible++;
    if (c.scheme?.requires_review || c.scheme?.flags?.length) schemeFlagged++;
  }

  return {
    autoRatePct,
    statusSlices,
    confBuckets,
    confThresholdIndex: 5, // the ".9" bucket clears the 0.85 threshold cleanly
    throughput,
    throughputLabels,
    topChapters,
    schemeEligible,
    schemeFlagged,
    avgConfidence,
  };
}
