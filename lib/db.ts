import { supabaseService } from "./supabase";
import type { PipelineStep } from "./schemas";

/**
 * Small persistence helpers shared by agents and routes. All run with the
 * service-role client (RLS bypassed) — server-only.
 */

export type AuditLevel = "info" | "warn" | "error";

export async function logAudit(
  shipmentId: string | null,
  step: string,
  event: string,
  data: Record<string, unknown> = {},
  level: AuditLevel = "info",
): Promise<void> {
  const { error } = await supabaseService().from("audit_log").insert({
    shipment_id: shipmentId,
    step,
    event,
    level,
    data,
  });
  if (error) console.error("[audit] insert failed:", error.message);
}

export async function setShipmentStatus(
  shipmentId: string,
  status: string,
  currentStep?: PipelineStep | string,
): Promise<void> {
  const patch: Record<string, unknown> = { classification_status: status };
  if (currentStep) patch.current_step = currentStep;
  const { error } = await supabaseService()
    .from("shipments")
    .update(patch)
    .eq("id", shipmentId);
  if (error) throw new Error(`setShipmentStatus failed: ${error.message}`);
}

export async function setShipmentError(
  shipmentId: string,
  message: string,
): Promise<void> {
  const { error } = await supabaseService()
    .from("shipments")
    .update({ classification_status: "failed", error: message })
    .eq("id", shipmentId);
  if (error) console.error("[db] setShipmentError failed:", error.message);
}

export async function getShipment(shipmentId: string) {
  const { data, error } = await supabaseService()
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();
  if (error) throw new Error(`getShipment failed: ${error.message}`);
  return data;
}

/**
 * Fetch-or-create the single evolving classification row for a shipment.
 */
export async function getOrCreateClassification(shipmentId: string) {
  const svc = supabaseService();
  const existing = await svc
    .from("classifications")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`getClassification failed: ${existing.error.message}`);
  }
  if (existing.data) return existing.data;

  const created = await svc
    .from("classifications")
    .insert({ shipment_id: shipmentId })
    .select("*")
    .single();
  if (created.error) {
    throw new Error(`createClassification failed: ${created.error.message}`);
  }
  return created.data;
}

export async function updateClassification(
  classificationId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabaseService()
    .from("classifications")
    .update(patch)
    .eq("id", classificationId);
  if (error) throw new Error(`updateClassification failed: ${error.message}`);
}
