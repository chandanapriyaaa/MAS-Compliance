import { Card } from "./ui/Card";
import { Donut, Bars, AreaSpark, HBars, type Slice } from "./charts/Charts";

export interface AnalyticsData {
  autoRatePct: number;
  statusSlices: Slice[];
  confBuckets: { label: string; value: number }[];
  confThresholdIndex: number;
  throughput: number[];
  throughputLabels: string[];
  topChapters: { label: string; value: number; sub?: string }[];
  schemeEligible: number;
  schemeFlagged: number;
  avgConfidence: number | null;
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-label">{title}</h3>
        {hint && <span className="text-[12px] text-label-tertiary">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}

export function Analytics({ data }: { data: AnalyticsData }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Outcomes" hint="auto vs review">
          <Donut
            slices={data.statusSlices}
            centerLabel={`${data.autoRatePct}%`}
            centerSub="auto-approved"
          />
        </Panel>

        <Panel title="Confidence" hint="aggregate, threshold 0.85">
          <Bars data={data.confBuckets} thresholdIndex={data.confThresholdIndex} />
        </Panel>

        <Panel title="Throughput" hint="shipments / day">
          <AreaSpark points={data.throughput} labels={data.throughputLabels} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Top HS chapters" hint="by volume">
            {data.topChapters.length ? (
              <HBars data={data.topChapters} />
            ) : (
              <p className="text-[13px] text-label-tertiary">No classifications yet.</p>
            )}
          </Panel>
        </div>

        <Panel title="Scheme eligibility">
          <div className="space-y-4">
            <Metric
              label="RoDTEP / drawback eligible"
              value={data.schemeEligible}
              tone="green"
            />
            <Metric label="Flagged for mismatch" value={data.schemeFlagged} tone="amber" />
            <Metric
              label="Avg. confidence"
              value={data.avgConfidence != null ? data.avgConfidence.toFixed(2) : "n/a"}
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "green" | "amber";
}) {
  const color =
    tone === "green" ? "text-green-ink" : tone === "amber" ? "text-amber-ink" : "text-label";
  return (
    <div className="flex items-baseline justify-between border-b border-separator/60 pb-2 last:border-0">
      <span className="text-[13px] text-label-secondary">{label}</span>
      <span className={`text-[20px] font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
