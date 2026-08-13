import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollFX } from "@/components/motion/ScrollFX";
import { AuroraCanvas } from "@/components/motion/AuroraCanvas";
import { ProductPreview } from "@/components/motion/ProductPreview";
import { PipelineScrolly } from "@/components/motion/PipelineScrolly";
import { CountUp } from "@/components/motion/CountUp";
import { ScrollWordReveal } from "@/components/motion/ScrollWordReveal";

export default function HomePage() {
  return (
    <div>
      <ScrollFX />
      <div className="scroll-progress" aria-hidden />

      {/* ── Hero (full-bleed, gradient runs to the very top behind the nav) ── */}
      <section className="bleed grain relative -mt-24 overflow-hidden pt-24">
        {/* abstract ambient visual, edges masked so it melts into the page */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(120% 100% at 50% 20%, #000 45%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(120% 100% at 50% 20%, #000 45%, transparent 100%)",
          }}
        >
          <AuroraCanvas className="absolute inset-0 h-full w-full" />
        </div>

        <div className="relative mx-auto max-w-content px-5 pb-20 pt-16 text-center sm:px-8 sm:pt-24">
          <h1
            data-reveal
            className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-3 text-[48px] font-semibold leading-[1.05] tracking-[-0.035em] text-label sm:text-[78px]"
          >
            <span>Trade</span>
            <InlineChip
              gradient="linear-gradient(135deg, var(--blue), #64d2ff)"
              rotate="-9deg"
              delay="0s"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-[0.5em] w-[0.5em]">
                <path d="m5 12.5 4.2 4.2L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </InlineChip>
            <span>compliance,</span>
            <InlineChip
              gradient="linear-gradient(135deg, #af52de, #ff375f)"
              rotate="8deg"
              delay="0.9s"
            >
              <span className="font-mono text-[0.34em] font-semibold text-white">
                HS
              </span>
            </InlineChip>
            <span>verified.</span>
          </h1>

          <div
            data-reveal
            style={{ ["--reveal-delay" as string]: "220ms" }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/dashboard/shipments">
              <Button>Open dashboard</Button>
            </Link>
            <Link href="/dashboard/review-queue">
              <Button variant="secondary">Review queue</Button>
            </Link>
          </div>

          {/* real product, floating */}
          <div
            data-reveal
            style={{ ["--reveal-delay" as string]: "460ms" }}
            className="mx-auto mt-16 max-w-3xl"
          >
            <div data-parallax="0.06" className="float-slow">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band (count-up) ── */}
      <section className="bleed border-y border-separator bg-surface">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-y-8 px-5 py-14 sm:px-8 md:grid-cols-4">
          <Stat value={6} label="Typed agents in the chain" />
          <Stat value={0.85} decimals={2} label="Auto-approve threshold" />
          <Stat value={100} suffix="%" label="Eval set passed (4-digit)" />
          <Stat value={3} label="Documents drafted per clearance" />
        </div>
      </section>

      {/* ── Editorial statement (scroll word-reveal) ── */}
      <section className="mx-auto max-w-content px-5 py-28 sm:px-8">
        <ScrollWordReveal
          lead={4}
          text="Most classifiers hand you a code. This one hands you evidence: sources it can cite, confidence it can defend, and a human in the loop the moment it cannot."
          className="max-w-4xl text-[30px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[44px]"
        />
      </section>

      {/* ── Signature scrolly: the pipeline ── */}
      <PipelineScrolly />

      {/* ── Confidence guardrail ── */}
      <section className="mx-auto max-w-content px-5 py-24 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div data-reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue">
              The guardrail
            </p>
            <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-label sm:text-[46px]">
              Confidence is derived,
              <br />
              not self-reported.
            </h2>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-label-secondary">
              An LLM saying it is 90% sure is not a probability. We combine
              retrieval strength with agreement across samples. If the evidence
              is thin, the system refuses to classify and routes to a human.
            </p>
          </div>

          <div data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            <Card className="p-7">
              <GateVisual />
            </Card>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto max-w-content px-5 pb-28 sm:px-8">
        <div
          data-reveal
          className="grain relative overflow-hidden rounded-xl border border-separator bg-surface p-12 text-center"
        >
          <h2 className="text-[32px] font-semibold tracking-tight text-label sm:text-[44px]">
            Run a shipment through the chain.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[16px] text-label-secondary">
            Watch it classify, cross-check, cost, and clear or escalate. Live.
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/dashboard/shipments">
              <Button>Open the dashboard</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** A small squircle badge tile sat inline between headline words (Locus cue).
 *  Rotation on the outer layer, ambient float on the inner, so they don't fight
 *  for `transform`. Sized in `em` so it scales with the headline. */
function InlineChip({
  gradient,
  rotate,
  delay,
  children,
}: {
  gradient: string;
  rotate: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-block align-middle"
      style={{ transform: `rotate(${rotate})` }}
    >
      <span className="float inline-grid" style={{ animationDelay: delay }}>
        <span
          className="grid h-[0.92em] w-[0.92em] place-items-center rounded-[0.26em]"
          style={{
            background: gradient,
            boxShadow:
              "0 10px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}

/** A single count-up stat in the band. */
function Stat({
  value,
  label,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <div className="text-center">
      <CountUp
        value={value}
        decimals={decimals}
        suffix={suffix}
        className="block text-[40px] font-semibold tracking-tight text-label sm:text-[52px]"
      />
      <div className="mx-auto mt-1 max-w-[12rem] text-[13px] text-label-secondary">
        {label}
      </div>
    </div>
  );
}

/** A compact static visualization of the auto-approve vs review split. */
function GateVisual() {
  const bars = [
    { label: "Knitted t-shirts", v: 0.88, ok: true },
    { label: "Laptop adapter", v: 0.94, ok: true },
    { label: "Basmati rice", v: 0.7, ok: false },
    { label: "Wool rug (thin evidence)", v: 0.41, ok: false },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[12px] text-label-tertiary">
        <span>Aggregate confidence</span>
        <span>threshold 0.85</span>
      </div>
      {bars.map((b) => (
        <div key={b.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-label-secondary">{b.label}</span>
            <span className={b.ok ? "text-green-ink" : "text-amber-ink"}>
              {b.ok ? "auto-approved" : "needs review"}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
            <span
              className="absolute inset-y-0 left-[85%] w-px bg-label-tertiary/70"
              aria-hidden
            />
            <span
              className="block h-full rounded-full"
              style={{
                width: `${b.v * 100}%`,
                background: b.ok ? "var(--green)" : "var(--amber)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
