import { cn } from "./cn";

/**
 * Status pill. Colour + a leading dot + text label — three redundant signals,
 * so state never depends on colour alone (colour-vision safe).
 */
type Tone = "neutral" | "blue" | "green" | "amber" | "red";

const TONES: Record<Tone, { dot: string; text: string; bg: string }> = {
  neutral: { dot: "bg-label-tertiary", text: "text-label-secondary", bg: "bg-[var(--fill-tertiary)]" },
  blue: { dot: "bg-blue", text: "text-blue-ink", bg: "bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]" },
  green: { dot: "bg-green", text: "text-green-ink", bg: "bg-[color-mix(in_srgb,var(--green)_14%,transparent)]" },
  amber: { dot: "bg-amber", text: "text-amber-ink", bg: "bg-[color-mix(in_srgb,var(--amber)_16%,transparent)]" },
  red: { dot: "bg-red", text: "text-red-ink", bg: "bg-[color-mix(in_srgb,var(--red)_14%,transparent)]" },
};

const STATUS_MAP: Record<string, { tone: Tone; label: string }> = {
  pending: { tone: "neutral", label: "Pending" },
  processing: { tone: "blue", label: "Processing" },
  auto_approved: { tone: "green", label: "Auto-approved" },
  human_approved: { tone: "green", label: "Approved" },
  needs_review: { tone: "amber", label: "Needs review" },
  rejected: { tone: "red", label: "Rejected" },
  failed: { tone: "red", label: "Failed" },
};

export function StatusPill({
  status,
  className,
  pulse = false,
}: {
  status: string;
  className?: string;
  pulse?: boolean;
}) {
  const s = STATUS_MAP[status] ?? { tone: "neutral" as Tone, label: status };
  const t = TONES[s.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        t.bg,
        t.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot, pulse && "animate-pulse")} />
      {s.label}
    </span>
  );
}

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        t.bg,
        t.text,
        className,
      )}
    >
      {children}
    </span>
  );
}
