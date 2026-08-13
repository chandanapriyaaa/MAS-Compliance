"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { Input } from "./ui/Field";

/**
 * Approve/reject controls for one review-queue item. On approve the reviewer
 * may correct the HS code before finalizing; approval triggers doc generation.
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
          resolved_hs_code: action === "approve" && hsCode ? hsCode : undefined,
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
    <div className="mt-4 space-y-3 border-t border-separator pt-4">
      <div className="grid gap-2.5 sm:grid-cols-[10rem_1fr]">
        <Input
          value={hsCode}
          onChange={(e) => setHsCode(e.target.value)}
          placeholder="Corrected HS"
          className="font-mono text-[13px]"
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reviewer notes"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => resolve("approve")}
          disabled={pending !== null}
          className="bg-green"
        >
          {pending === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => resolve("reject")}
          disabled={pending !== null}
        >
          {pending === "reject" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
      {error && <p className="text-[13px] font-medium text-red-ink">{error}</p>}
    </div>
  );
}
