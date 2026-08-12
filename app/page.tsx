export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Trade Compliance Copilot
        </h1>
        <p className="max-w-2xl text-slate-600">
          A multi-agent system for Indian exporters and CHAs. It classifies HS
          codes, cross-checks DGFT scheme eligibility (RoDTEP / drawback),
          calculates duty, and drafts compliant documentation — escalating
          low-confidence classifications to human review instead of guessing.
        </p>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Compliance guardrail:</strong> No HS classification or duty
        figure is auto-approved below the configured confidence threshold. Every
        output carries a confidence score; anything below threshold is routed to
        the human review queue.
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <a
          href="/dashboard/shipments"
          className="rounded-lg border border-slate-200 p-5 transition hover:border-slate-400"
        >
          <h2 className="font-medium">Shipments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track classification status and pipeline progress for each shipment.
          </p>
        </a>
        <a
          href="/dashboard/review-queue"
          className="rounded-lg border border-slate-200 p-5 transition hover:border-slate-400"
        >
          <h2 className="font-medium">Review Queue</h2>
          <p className="mt-1 text-sm text-slate-600">
            Human-in-the-loop queue for low-confidence classifications and
            flagged scheme mismatches.
          </p>
        </a>
      </section>
    </div>
  );
}
