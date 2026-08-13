import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/StatusPill";

const STEPS = [
  { k: "01", name: "Intake", desc: "Parses description, invoice, and spec sheet into structured product facts." },
  { k: "02", name: "HS Classification", desc: "RAG retrieval over the HS schedule; confidence derived from evidence, not self-report." },
  { k: "03", name: "Scheme Cross-Check", desc: "RoDTEP / drawback eligibility, flagging claimed-vs-actual mismatches." },
  { k: "04", name: "Duty Calculator", desc: "BCD, surcharge, and IGST computed from grounded reference rates." },
  { k: "05", name: "Escalation", desc: "Aggregate confidence gates auto-approval; the rest routes to human review." },
  { k: "06", name: "Documentation", desc: "Drafts invoice, packing-list, and LC language once the code is finalized." },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="rise flex flex-col items-center pt-6 text-center">
        <Pill tone="blue" className="mb-5">
          Multi-agent · Human-in-the-loop
        </Pill>
        <h1 className="max-w-3xl text-balance text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-label sm:text-[64px]">
          Trade compliance,
          <br />
          <span className="text-blue">verified — not guessed.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-label-secondary sm:text-[19px]">
          For Indian exporters and CHAs. Classify HS codes, cross-check DGFT
          scheme eligibility, calculate duty, and draft compliant paperwork —
          with low-confidence cases escalated to a human, never auto-filed.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/shipments">
            <Button>Open dashboard</Button>
          </Link>
          <Link href="/dashboard/review-queue">
            <Button variant="secondary">Review queue</Button>
          </Link>
        </div>

        {/* Guardrail — the product's core promise, stated plainly */}
        <Card className="mt-14 w-full max-w-2xl text-left">
          <div className="flex items-start gap-4 p-6">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--amber)_16%,transparent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3 2.5 20.5h19L12 3Z" stroke="var(--amber-ink)" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M12 10v4.2M12 17.4v.1" stroke="var(--amber-ink)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-label">
                Compliance guardrail
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-label-secondary">
                No HS classification or duty figure is auto-approved below the
                confidence threshold. Every output carries a score; anything
                below it is routed to human review. Wrong output here has real
                financial and legal consequence.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Pipeline bento */}
      <section className="space-y-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue">
            The pipeline
          </p>
          <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-label">
            Six agents, one audited chain
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.k} interactive className="p-6">
              <div className="font-mono text-xs text-label-tertiary">{s.k}</div>
              <h3 className="mt-2 text-[16px] font-semibold text-label">
                {s.name}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-label-secondary">
                {s.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
