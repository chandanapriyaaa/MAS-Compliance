import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface AuditRow {
  id: number;
  shipment_id: string | null;
  product: string | null;
  step: string;
  event: string;
  level: "info" | "warn" | "error";
  data: Record<string, unknown>;
  created_at: string;
}

/**
 * GET /api/audit?q=&level=&step=&limit=
 * Org-wide audit-log search across all shipments. Compliance evidence trail.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const level = url.searchParams.get("level") ?? "";
  const step = url.searchParams.get("step") ?? "";
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 200));

  const svc = supabaseService();
  let query = svc
    .from("audit_log")
    .select("id, shipment_id, step, event, level, data, created_at")
    .order("id", { ascending: false })
    .limit(limit);

  if (level) query = query.eq("level", level);
  if (step) query = query.eq("step", step);
  if (q) query = query.or(`event.ilike.%${q}%,step.ilike.%${q}%`);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // attach product description per shipment
  const ids = Array.from(
    new Set((logs ?? []).map((l) => l.shipment_id).filter(Boolean)),
  ) as string[];
  const products = new Map<string, string>();
  if (ids.length) {
    const { data: ships } = await svc
      .from("shipments")
      .select("id, product_description")
      .in("id", ids);
    for (const s of ships ?? []) products.set(s.id, s.product_description);
  }

  const rows: AuditRow[] = (logs ?? []).map((l) => ({
    id: l.id,
    shipment_id: l.shipment_id,
    product: l.shipment_id ? products.get(l.shipment_id) ?? null : null,
    step: l.step,
    event: l.event,
    level: l.level,
    data: l.data,
    created_at: l.created_at,
  }));

  return NextResponse.json({ rows });
}
