import { supabaseService } from "@/lib/supabase";
import { ReviewActions } from "@/components/ReviewActions";
import { SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/StatusPill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Human review queue. Low-confidence classifications and flagged scheme
 * mismatches — the cases the guardrail refused to auto-approve.
 */
export default async function ReviewQueuePage() {
  const svc = supabaseService();
  const { data: items, error } = await svc
    .from("human_review_queue")
    .select("*")
    .in("status", ["open", "claimed"])
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Human-in-the-loop"
        title="Review queue"
        subtitle="Not auto-approved: below the confidence threshold, or flagged for a scheme mismatch."
      >
        <Pill tone={items && items.length ? "amber" : "green"}>
          {items?.length ?? 0} awaiting review
        </Pill>
      </SectionHeading>

      {error && (
        <p className="text-[14px] font-medium text-red-ink">
          Failed to load queue: {error.message}
        </p>
      )}

      {(!items || items.length === 0) && !error && (
        <Card className="p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--green)_16%,transparent)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m5 12.5 4.2 4.2L19 7" stroke="var(--green-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-4 text-[15px] font-medium text-label">Queue is clear</p>
          <p className="mt-1 text-[13px] text-label-tertiary">
            Nothing is awaiting review.
          </p>
        </Card>
      )}

      <div className="grid gap-4">
        {(items ?? []).map((item) => {
          const payload = (item.payload ?? {}) as Record<string, any>;
          const flags = (item.flags ?? []) as string[];
          const scheme = payload.scheme as Record<string, any> | null;
          const duty = payload.duty as Record<string, any> | null;
          return (
            <Card key={item.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[15px] font-semibold text-label">
                      {payload.hs_code || "no code produced"}
                    </span>
                    <Pill tone="amber">
                      conf{" "}
                      {item.min_confidence != null
                        ? Number(item.min_confidence).toFixed(2)
                        : "n/a"}
                    </Pill>
                  </div>
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-label-secondary">
                    {item.reason}
                  </p>
                </div>
                {scheme && (
                  <div className="text-right text-[12px] text-label-tertiary">
                    {scheme.rodtep_rate != null && (
                      <div>RoDTEP {(scheme.rodtep_rate * 100).toFixed(1)}%</div>
                    )}
                    {scheme.drawback_rate != null && (
                      <div>Drawback {(scheme.drawback_rate * 100).toFixed(1)}%</div>
                    )}
                    {duty?.duty_amount != null && (
                      <div>
                        Duty {duty.currency} {Number(duty.duty_amount).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {flags.map((f, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-[var(--fill-tertiary)] px-2 py-1 font-mono text-[11px] text-label-secondary"
                    >
                      {f.split(":")[0]}
                    </span>
                  ))}
                </div>
              )}

              {payload.reasoning && (
                <details className="mt-3 text-[13px] text-label-secondary">
                  <summary className="cursor-pointer select-none text-blue">
                    Model reasoning
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                    {payload.reasoning}
                  </p>
                </details>
              )}

              <ReviewActions reviewId={item.id} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
