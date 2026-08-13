import { cn } from "./cn";

/**
 * Confidence meter. A thin track with a filled bar whose colour crosses from
 * amber to green at the decision threshold — so "below threshold" reads
 * instantly without needing the number.
 */
export function Meter({
  value,
  threshold = 0.85,
  className,
  showValue = true,
}: {
  value: number | null | undefined;
  threshold?: number;
  className?: string;
  showValue?: boolean;
}) {
  const v = typeof value === "number" ? Math.max(0, Math.min(1, value)) : null;
  const pct = v == null ? 0 : Math.round(v * 100);
  const ok = v != null && v >= threshold;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
        {/* threshold tick */}
        <span
          className="absolute top-0 bottom-0 w-px bg-label-tertiary/70"
          style={{ left: `${threshold * 100}%` }}
          aria-hidden
        />
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-spring"
          style={{
            width: `${pct}%`,
            background: ok ? "var(--green)" : "var(--amber)",
          }}
        />
      </div>
      {showValue && (
        <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-label-secondary">
          {v == null ? "n/a" : v.toFixed(2)}
        </span>
      )}
    </div>
  );
}
