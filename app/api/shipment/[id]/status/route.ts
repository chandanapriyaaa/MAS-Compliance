import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/shipment/[id]/status
 * Polled by the frontend for live pipeline progress. Returns the shipment,
 * its evolving classification, and any open review-queue entry.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const svc = supabaseService();

  const { data: shipment, error } = await svc
    .from("shipments")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!shipment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: classification } = await svc
    .from("classifications")
    .select("*")
    .eq("shipment_id", params.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: review } = await svc
    .from("human_review_queue")
    .select("id, reason, status, min_confidence, flags, created_at")
    .eq("shipment_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    shipment: {
      id: shipment.id,
      status: shipment.classification_status,
      current_step: shipment.current_step,
      product_description: shipment.product_description,
      origin_country: shipment.origin_country,
      dest_country: shipment.dest_country,
      error: shipment.error,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
    },
    classification: classification ?? null,
    review: review ?? null,
  });
}
