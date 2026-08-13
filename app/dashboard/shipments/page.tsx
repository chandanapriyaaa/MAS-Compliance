import { supabaseService } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { ShipmentRow } from "@/app/api/shipments/route";
import { NewShipmentForm } from "@/components/NewShipmentForm";
import { ShipmentsTable } from "@/components/ShipmentsTable";
import { SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/motion/CountUp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const svc = supabaseService();
  const { data: shipments } = await svc
    .from("shipments")
    .select(
      "id, product_description, classification_status, current_step, origin_country, dest_country, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const ids = (shipments ?? []).map((s) => s.id);
  const { data: classifications } = ids.length
    ? await svc
        .from("classifications")
        .select("shipment_id, hs_code, confidence_score, aggregate_confidence")
        .in("shipment_id", ids)
    : { data: [] as any[] };
  const byShipment = new Map((classifications ?? []).map((c) => [c.shipment_id, c]));

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

  const total = rows.length;
  const autoApproved = rows.filter(
    (r) => r.status === "auto_approved" || r.status === "human_approved",
  ).length;
  const needsReview = rows.filter((r) => r.status === "needs_review").length;
  const inFlight = rows.filter(
    (r) => r.status === "pending" || r.status === "processing",
  ).length;

  const threshold = env.confidenceThreshold();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Dashboard"
        title="Shipments"
        subtitle="Each shipment runs the full chain. Status and confidence update live."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={total} />
        <Stat label="Approved" value={autoApproved} tone="green" />
        <Stat label="Needs review" value={needsReview} tone="amber" />
        <Stat label="In flight" value={inFlight} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.85fr_1fr]">
        <ShipmentsTable initial={rows} threshold={threshold} />
        <NewShipmentForm />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "green" | "amber" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-green-ink"
      : tone === "amber"
        ? "text-amber-ink"
        : tone === "blue"
          ? "text-blue-ink"
          : "text-label";
  return (
    <Card className="p-5">
      <CountUp
        value={value}
        duration={800}
        className={`block text-[30px] font-semibold leading-none ${color}`}
      />
      <div className="mt-1.5 text-[13px] text-label-secondary">{label}</div>
    </Card>
  );
}
