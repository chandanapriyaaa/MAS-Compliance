"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve/reject controls for a single review-queue item. On approve the
 * reviewer may correct the HS code before finalizing.
 */
export function ReviewActions({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function resolve(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/review/${reviewId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          reviewer_notes: notes || undefined,
          resolved_hs_code:
            action === "approve" && hsCode ? hsCode : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={hsCode}
          onChange={(e) => setHsCode(e.target.value)}
          placeholder="Corrected HS code (optional)"
          className="rounded border border-slate-300 p-1.5 text-sm font-mono"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reviewer notes"
          className="flex-1 rounded border border-slate-300 p-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => resolve("approve")}
          disabled={pending !== null}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => resolve("reject")}
          disabled={pending !== null}
          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
