"use client";

import { useState } from "react";
import { cn } from "../ui/cn";

/**
 * Dependency-free SVG chart primitives. Colours come from the semantic tokens
 * so they adapt to light/dark. Interactive: hovering a mark highlights it and
 * shows a light explainer tooltip; keyboard-focusable where it matters.
 */

// ── Tooltip ────────────────────────────────────────────────────
function Tip({
  x,
  y,
  children,
}: {
  x: number | string;
  y: number | string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-separator bg-elevated px-2.5 py-1.5 text-[11px] leading-snug text-label shadow-md"
      style={{ left: x, top: y }}
      role="tooltip"
    >
      {children}
    </div>
  );
}

// ── Donut ──────────────────────────────────────────────────────
export interface Slice {
  label: string;
  value: number;
  color: string;
  note?: string;
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
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-tertiary)" strokeWidth={thickness} />
          {slices.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === i ? thickness + 4 : thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{
                  opacity: hover == null || hover === i ? 1 : 0.32,
                  transition: "opacity 0.15s, stroke-width 0.15s",
                  cursor: "pointer",
                }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {hover != null && (
          <Tip x="50%" y={size / 2 - 6}>
            <span className="font-medium">{slices[hover].label}</span> ·{" "}
            {slices[hover].value} ({Math.round((slices[hover].value / total) * 100)}%)
          </Tip>
        )}
      </div>
      <div className="min-w-0">
        {centerLabel != null && (
          <div className="mb-2">
            <div className="text-[26px] font-semibold leading-none text-label">{centerLabel}</div>
            {centerSub && <div className="text-[12px] text-label-tertiary">{centerSub}</div>}
          </div>
        )}
        <ul className="space-y-1.5">
          {slices.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                "flex cursor-default items-center gap-2 rounded px-1 py-0.5 text-[13px] transition-colors",
                hover === i && "bg-[var(--fill-quaternary)]",
              )}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
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
  note = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  thresholdIndex?: number;
  note?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="relative">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pass = thresholdIndex != null && i >= thresholdIndex;
          return (
            <div
              key={d.label}
              className="flex flex-1 cursor-pointer flex-col items-center justify-end gap-1"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="text-[10px] tabular-nums text-label-tertiary">{d.value || ""}</span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(d.value / max) * (height - 22)}px`,
                  minHeight: d.value ? 3 : 0,
                  background: pass ? "var(--green)" : "var(--blue)",
                  opacity: hover == null || hover === i ? 1 : 0.4,
                  transition: "opacity 0.15s",
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
      {hover != null && (
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-lg border border-separator bg-elevated px-2.5 py-1.5 text-[11px] text-label shadow-md">
          <span className="font-medium">{data[hover].value}</span> shipment
          {data[hover].value === 1 ? "" : "s"} @ conf {data[hover].label}
          {note && <div className="text-label-tertiary">{note}</div>}
        </div>
      )}
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
  const [hover, setHover] = useState<number | null>(null);
  const w = 320;
  const max = Math.max(1, ...points);
  const stepX = points.length > 1 ? w / (points.length - 1) : w;
  const y = (v: number) => height - 16 - (v / max) * (height - 26);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${y(p)}`).join(" ");
  const area = `${path} L ${w} ${height - 16} L 0 ${height - 16} Z`;

  return (
    <div className="relative">
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
          <g key={i}>
            <circle cx={i * stepX} cy={y(p)} r={hover === i ? 4 : 2.5} fill="var(--blue)" />
            <rect
              x={i * stepX - stepX / 2}
              y={0}
              width={stepX}
              height={height}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-separator bg-elevated px-2.5 py-1.5 text-[11px] text-label shadow-md"
          style={{ left: `${(hover / Math.max(1, points.length - 1)) * 100}%`, top: y(points[hover]) - 4 }}
        >
          <span className="font-medium">{points[hover]}</span>/day
          {labels && labels[hover] ? <span className="text-label-tertiary"> · {labels[hover]}</span> : null}
        </div>
      )}
      {labels && (
        <div className="mt-1 flex justify-between text-[10px] text-label-tertiary">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

// ── Radar / spider ─────────────────────────────────────────────
export interface RadarAxis {
  label: string;
  value: number;
  display?: string;
  desc?: string;
}

export function Radar({ axes, size = 260 }: { axes: RadarAxis[]; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

  const rings = [0.25, 0.5, 0.75, 1];
  const poly = (r: (i: number) => number) => axes.map((_, i) => pt(i, r(i)).join(",")).join(" ");
  const dataPoly = poly((i) => R * Math.max(0.02, Math.min(1, axes[i].value)));

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block">
        {rings.map((ring) => (
          <polygon key={ring} points={poly(() => R * ring)} fill="none" stroke="var(--separator)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--separator)" strokeWidth="1" />;
        })}
        <polygon
          points={dataPoly}
          fill="color-mix(in srgb, var(--blue) 22%, transparent)"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {axes.map((a, i) => {
          const [x, y] = pt(i, R * Math.max(0.02, Math.min(1, a.value)));
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={hover === i ? 5 : 3} fill="var(--blue)" style={{ transition: "r 0.12s" }} />
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="transparent"
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          );
        })}
        {axes.map((a, i) => {
          const [x, y] = pt(i, R + 16);
          const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor as "middle" | "start" | "end"}
              dominantBaseline="middle"
              className={cn("text-[10px]", hover === i ? "fill-[var(--label)]" : "fill-[var(--label-secondary)]")}
              style={{ cursor: "pointer" }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              {a.label}
              {a.display ? ` ${a.display}` : ""}
            </text>
          );
        })}
      </svg>
      {hover != null && (
        <Tip x="50%" y={22}>
          <span className="font-medium">{axes[hover].label}</span>
          {axes[hover].display ? ` · ${axes[hover].display}` : ""}
          {axes[hover].desc ? <div className="text-label-tertiary">{axes[hover].desc}</div> : null}
        </Tip>
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
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d, i) => (
        <li
          key={d.label}
          className="cursor-default space-y-1 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--fill-quaternary)]"
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
        >
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
              style={{
                width: `${(d.value / max) * 100}%`,
                opacity: hover == null || hover === i ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
