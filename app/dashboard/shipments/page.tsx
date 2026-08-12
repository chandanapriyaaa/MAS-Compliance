import { supabaseService } from "@/lib/supabase";
import { NewShipmentForm } from "@/components/NewShipmentForm";
import { StatusBadge } from "@/components/StatusBadge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shipments dashboard. Lists recent shipments with their live classification
 * status and confidence. Server component reading via the service client.
 */
export default async function ShipmentsPage() {
  const svc = supabaseService();
  const { data: shipments, error } = await svc
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

  const byShipment = new Map(
    (classifications ?? []).map((c) => [c.shipment_id, c]),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Shipments</h1>

      <NewShipmentForm />

      {error && (
        <p className="text-sm text-red-700">
          Failed to load shipments: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 font-medium">HS code</th>
              <th className="px-4 py-2 font-medium">Confidence</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Step</th>
            </tr>
          </thead>
          <tbody>
            {(shipments ?? []).map((s) => {
              const c = byShipment.get(s.id);
              const conf = c?.aggregate_confidence ?? c?.confidence_score;
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="max-w-xs truncate px-4 py-2" title={s.product_description}>
                    {s.product_description}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {(s.origin_country ?? "?") + " → " + (s.dest_country ?? "?")}
                  </td>
                  <td className="px-4 py-2 font-mono">{c?.hs_code ?? "—"}</td>
                  <td className="px-4 py-2">
                    {conf != null ? Number(conf).toFixed(3) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={s.classification_status} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">{s.current_step}</td>
                </tr>
              );
            })}
            {(!shipments || shipments.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No shipments yet. Submit one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
