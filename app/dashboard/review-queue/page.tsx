import { supabaseService } from "@/lib/supabase";
import { ReviewActions } from "@/components/ReviewActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Human review queue. Shows open low-confidence / flagged classifications for a
 * compliance reviewer to approve (optionally correcting the HS code) or reject.
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Review queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Low-confidence classifications and flagged scheme mismatches. Nothing
          here was auto-approved.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700">
          Failed to load queue: {error.message}
        </p>
      )}

      {(!items || items.length === 0) && (
        <p className="rounded-lg border border-slate-200 p-6 text-center text-slate-500">
          Queue is empty — nothing awaiting review.
        </p>
      )}

      <div className="space-y-4">
        {(items ?? []).map((item) => {
          const payload = (item.payload ?? {}) as Record<string, any>;
          const flags = (item.flags ?? []) as string[];
          return (
            <div
              key={item.id}
              className="rounded-lg border border-amber-200 bg-amber-50/40 p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-mono text-sm">
                  HS: {payload.hs_code || "— (none produced)"}
                </div>
                <div className="text-xs text-slate-500">
                  min confidence:{" "}
                  {item.min_confidence != null
                    ? Number(item.min_confidence).toFixed(3)
                    : "—"}
                </div>
              </div>

              <p className="mt-2 text-sm text-slate-700">
                <strong>Reason:</strong> {item.reason}
              </p>

              {flags.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
                  {flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}

              {payload.reasoning && (
                <details className="mt-2 text-sm text-slate-600">
                  <summary className="cursor-pointer">Model reasoning</summary>
                  <p className="mt-1 whitespace-pre-wrap">{payload.reasoning}</p>
                </details>
              )}

              <ReviewActions reviewId={item.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
