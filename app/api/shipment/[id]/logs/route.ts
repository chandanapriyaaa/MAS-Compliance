import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface LogEntry {
  id: number;
  step: string;
  event: string;
  level: "info" | "warn" | "error";
  data: Record<string, unknown>;
  created_at: string;
}

/**
 * GET /api/shipment/[id]/logs
 * Full audit trail + current state for one shipment — powers the workflow and
 * terminal-log views. Polled by the drawer while the shipment is in flight.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const svc = supabaseService();

  const { data: shipment, error } = await svc
    .from("shipments")
    .select(
      "id, product_description, origin_country, dest_country, classification_status, current_step, error, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: classification } = await svc
    .from("classifications")
    .select(
      "hs_code, confidence_score, aggregate_confidence, reasoning, retrieved_sources, scheme, duty, documents, is_final",
    )
    .eq("shipment_id", params.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: logs } = await svc
    .from("audit_log")
    .select("id, step, event, level, data, created_at")
    .eq("shipment_id", params.id)
    .order("id", { ascending: true })
    .limit(500);

  return NextResponse.json({
    shipment,
    classification: classification ?? null,
    logs: (logs ?? []) as LogEntry[],
  });
}
