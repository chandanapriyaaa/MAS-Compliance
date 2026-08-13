import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ShipmentRow {
  id: string;
  product_description: string;
  origin_country: string | null;
  dest_country: string | null;
  status: string;
  current_step: string;
  hs_code: string | null;
  confidence: number | null;
  created_at: string;
}

/** GET /api/shipments — recent shipments joined with their classification. */
export async function GET() {
  const svc = supabaseService();
  const { data: shipments, error } = await svc
    .from("shipments")
    .select(
      "id, product_description, classification_status, current_step, origin_country, dest_country, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (shipments ?? []).map((s) => s.id);
  const { data: classifications } = ids.length
    ? await svc
        .from("classifications")
        .select("shipment_id, hs_code, confidence_score, aggregate_confidence")
        .in("shipment_id", ids)
    : { data: [] as any[] };

  const byShipment = new Map(
    (classifications ?? []).map((c) => [c.shipment_id, c]),
  );

  const rows: ShipmentRow[] = (shipments ?? []).map((s) => {
    const c = byShipment.get(s.id);
    const conf = c?.aggregate_confidence ?? c?.confidence_score ?? null;
    return {
      id: s.id,
      product_description: s.product_description,
      origin_country: s.origin_country,
      dest_country: s.dest_country,
      status: s.classification_status,
      current_step: s.current_step,
      hs_code: c?.hs_code ?? null,
      confidence: conf != null ? Number(conf) : null,
      created_at: s.created_at,
    };
  });

  return NextResponse.json({ rows });
}
