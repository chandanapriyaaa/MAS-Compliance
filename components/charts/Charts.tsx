import { cn } from "../ui/cn";

/**
 * Dependency-free SVG chart primitives. Colours come from the semantic tokens
 * so they adapt to light/dark. Each is server-renderable (no client JS).
 */

// ── Donut ──────────────────────────────────────────────────────
export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  size = 168,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fill-tertiary)"
          strokeWidth={thickness}
        />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0">
        {centerLabel != null && (
          <div className="mb-2">
            <div className="text-[26px] font-semibold leading-none text-label">{centerLabel}</div>
            {centerSub && <div className="text-[12px] text-label-tertiary">{centerSub}</div>}
          </div>
        )}
        <ul className="space-y-1.5">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="text-label-secondary">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums text-label">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Vertical bars (histogram) ──────────────────────────────────
export function Bars({
  data,
  height = 130,
  thresholdIndex,
}: {
  data: { label: string; value: number }[];
  height?: number;
  /** Bars at or after this index render in the "pass" colour. */
  thresholdIndex?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pass = thresholdIndex != null && i >= thresholdIndex;
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] tabular-nums text-label-tertiary">
                {d.value || ""}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(d.value / max) * (height - 22)}px`,
                  minHeight: d.value ? 3 : 0,
                  background: pass ? "var(--green)" : "var(--blue)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[10px] text-label-tertiary">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Area sparkline (throughput over time) ──────────────────────
export function AreaSpark({
  points,
  labels,
  height = 120,
}: {
  points: number[];
  labels?: string[];
  height?: number;
}) {
  const w = 320;
  const max = Math.max(1, ...points);
  const stepX = points.length > 1 ? w / (points.length - 1) : w;
  const y = (v: number) => height - 16 - (v / max) * (height - 26);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${y(p)}`).join(" ");
  const area = `${path} L ${w} ${height - 16} L 0 ${height - 16} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark)" />
        <path d={path} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * stepX} cy={y(p)} r="2.5" fill="var(--blue)" />
        ))}
      </svg>
      {labels && (
        <div className="mt-1 flex justify-between text-[10px] text-label-tertiary">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

// ── Horizontal bar list (top-N) ────────────────────────────────
export function HBars({
  data,
  className,
}: {
  data: { label: string; value: number; sub?: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d) => (
        <li key={d.label} className="space-y-1">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-mono text-label">{d.label}</span>
            <span className="text-label-tertiary">
              {d.sub ? `${d.sub} · ` : ""}
              {d.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
            <span
              className="block h-full rounded-full bg-blue"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
