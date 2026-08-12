import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase";
import { enqueueStep } from "@/lib/qstash";
import { logAudit, setShipmentStatus, updateClassification } from "@/lib/db";

export const runtime = "nodejs";

const ResolveBody = z.object({
  action: z.enum(["approve", "reject"]),
  reviewer_notes: z.string().optional(),
  // On approve, the reviewer may correct the HS code.
  resolved_hs_code: z.string().optional(),
});

/**
 * POST /api/review/[id]/resolve
 * Human decision on a review-queue item. On approve, the classification is
 * finalized (with any corrected HS code) and document generation is triggered.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const parsed = ResolveBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { action, reviewer_notes, resolved_hs_code } = parsed.data;

  const svc = supabaseService();
  const { data: item, error } = await svc
    .from("human_review_queue")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "open" && item.status !== "claimed") {
    return NextResponse.json(
      { error: `Review already ${item.status}` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    await svc
      .from("human_review_queue")
      .update({ status: "rejected", reviewer_notes, resolved_at: now })
      .eq("id", item.id);
    await setShipmentStatus(item.shipment_id, "rejected", "escalate");
    await logAudit(item.shipment_id, "review", "review_rejected", {
      reviewer_notes,
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve
  if (item.classification_id) {
    const patch: Record<string, unknown> = { is_final: true };
    if (resolved_hs_code) patch.hs_code = resolved_hs_code;
    await updateClassification(item.classification_id, patch);
  }
  await svc
    .from("human_review_queue")
    .update({
      status: "approved",
      reviewer_notes,
      resolved_hs_code: resolved_hs_code ?? null,
      resolved_at: now,
    })
    .eq("id", item.id);
  await setShipmentStatus(item.shipment_id, "human_approved", "docgen");
  await logAudit(item.shipment_id, "review", "review_approved", {
    reviewer_notes,
    resolved_hs_code: resolved_hs_code ?? null,
  });

  // Generate documents now that the classification is human-approved.
  await enqueueStep({
    shipmentId: item.shipment_id,
    step: "docgen",
    context: {},
  });

  return NextResponse.json({ ok: true, status: "approved" });
}
