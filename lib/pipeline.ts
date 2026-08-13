import { env } from "./env";
import { enqueueStep } from "./qstash";
import {
  IntakeOutput,
  type PipelineStep,
  type CrossCheckOutput,
  type DutyOutput,
} from "./schemas";
import {
  getOrCreateClassification,
  getShipment,
  logAudit,
  setShipmentError,
  setShipmentStatus,
  updateClassification,
} from "./db";
import { supabaseService } from "./supabase";
import { runIntake } from "./agents/intake";
import { runClassify } from "./agents/classify";
import { runCrossCheck } from "./agents/crosscheck";
import { runDuty } from "./agents/duty";
import { runEscalation } from "./agents/escalate";
import { runDocGen } from "./agents/docgen";

/**
 * Pipeline orchestrator.
 *
 * Each /api/agents/[step] route delegates here. A step does its work, persists
 * results, and enqueues the next step — it never awaits the rest of the chain.
 * On any unhandled error the shipment is marked failed and an audit row is
 * written; QStash retries handle transient failures.
 */
export async function runStep(
  shipmentId: string,
  step: PipelineStep,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    switch (step) {
      case "intake":
        return await stepIntake(shipmentId);
      case "classify":
        return await stepClassify(shipmentId);
      case "crosscheck":
        return await stepCrossCheck(shipmentId);
      case "duty":
        return await stepDuty(shipmentId);
      case "escalate":
        return await stepEscalate(shipmentId);
      case "docgen":
        return await stepDocGen(shipmentId);
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAudit(shipmentId, step, "step_failed", { message }, "error");
    await setShipmentError(shipmentId, `${step}: ${message}`);
    throw err;
  }
}

// ── intake ─────────────────────────────────────────────────────
async function stepIntake(shipmentId: string) {
  const shipment = await getShipment(shipmentId);
  await setShipmentStatus(shipmentId, "processing", "intake");

  const intake = await runIntake({
    shipmentId,
    productDescription: shipment.product_description,
    rawInput: (shipment.raw_input as Record<string, unknown>) ?? {},
    originCountry: shipment.origin_country ?? undefined,
    destCountry: shipment.dest_country ?? undefined,
  });

  await supabaseService()
    .from("shipments")
    .update({ structured_intake: intake, current_step: "classify" })
    .eq("id", shipmentId);
  await logAudit(shipmentId, "intake", "intake_complete", { intake });

  await enqueueStep({ shipmentId, step: "classify", context: {} });
  return { ok: true, next: "classify" };
}

// ── classify ───────────────────────────────────────────────────
async function stepClassify(shipmentId: string) {
  const shipment = await getShipment(shipmentId);
  const intake = IntakeOutput.parse(shipment.structured_intake);

  const result = await runClassify({
    productDescription: shipment.product_description,
    intake,
  });

  const classification = await getOrCreateClassification(shipmentId);
  await updateClassification(classification.id, {
    hs_code: result.hs_code || null,
    confidence_score: result.confidence_score,
    reasoning: result.reasoning,
    retrieved_sources: result.retrieved_sources,
    scheme: null,
    duty: null,
  });
  await logAudit(shipmentId, "classify", "classification_complete", {
    hs_code: result.hs_code,
    confidence: result.confidence_score,
    insufficient_context: result.insufficient_context,
    signals: result.signals,
  });
  await setShipmentStatus(shipmentId, "processing", "crosscheck");

  // Short-circuit to escalation when there's no usable code — don't waste
  // downstream lookups, and guarantee a review.
  if (result.insufficient_context || !result.hs_code) {
    await enqueueStep({ shipmentId, step: "escalate", context: {} });
    return { ok: true, next: "escalate", reason: "insufficient_context" };
  }

  await enqueueStep({ shipmentId, step: "crosscheck", context: {} });
  return { ok: true, next: "crosscheck", hs_code: result.hs_code };
}

// ── crosscheck ─────────────────────────────────────────────────
async function stepCrossCheck(shipmentId: string) {
  const shipment = await getShipment(shipmentId);
  const classification = await getOrCreateClassification(shipmentId);
  const raw = (shipment.raw_input as Record<string, unknown>) ?? {};

  const scheme = await runCrossCheck({
    hs_code: classification.hs_code ?? "",
    origin_country: shipment.origin_country ?? "unknown",
    dest_country: shipment.dest_country ?? "unknown",
    claimed_scheme: (raw.claimed_scheme as
      | "rodtep"
      | "drawback"
      | "advance_authorization"
      | "none") ?? "none",
  });

  await updateClassification(classification.id, { scheme });
  await logAudit(shipmentId, "crosscheck", "crosscheck_complete", { scheme });
  await setShipmentStatus(shipmentId, "processing", "duty");

  await enqueueStep({ shipmentId, step: "duty", context: {} });
  return { ok: true, next: "duty" };
}

// ── duty ───────────────────────────────────────────────────────
async function stepDuty(shipmentId: string) {
  const shipment = await getShipment(shipmentId);
  const classification = await getOrCreateClassification(shipmentId);
  const raw = (shipment.raw_input as Record<string, unknown>) ?? {};
  const assessableValue = Number(raw.assessable_value);

  let duty: DutyOutput | null = null;
  if (Number.isFinite(assessableValue) && assessableValue > 0) {
    duty = await runDuty({
      hs_code: classification.hs_code ?? "",
      origin_country: shipment.origin_country ?? "unknown",
      dest_country: shipment.dest_country ?? "unknown",
      assessable_value: assessableValue,
      currency: (raw.currency as string) ?? "INR",
    });
    await updateClassification(classification.id, { duty });
    await logAudit(shipmentId, "duty", "duty_complete", { duty });
  } else {
    await logAudit(
      shipmentId,
      "duty",
      "duty_skipped",
      { reason: "no assessable_value provided" },
      "warn",
    );
  }

  await setShipmentStatus(shipmentId, "processing", "escalate");
  await enqueueStep({ shipmentId, step: "escalate", context: {} });
  return { ok: true, next: "escalate", duty_computed: duty != null };
}

// ── escalate ───────────────────────────────────────────────────
async function stepEscalate(shipmentId: string) {
  const classification = await getOrCreateClassification(shipmentId);
  const threshold = env.confidenceThreshold();

  const scheme = classification.scheme as CrossCheckOutput | null;
  const duty = classification.duty as DutyOutput | null;

  const steps: {
    label: string;
    confidence: number;
    forceReview?: boolean;
    reason?: string;
  }[] = [
    {
      label: "classify",
      confidence: Number(classification.confidence_score ?? 0),
      forceReview: !classification.hs_code,
      reason: classification.hs_code ? undefined : "no HS code produced",
    },
  ];

  if (scheme) {
    steps.push({
      label: "crosscheck",
      confidence: scheme.confidence,
      forceReview: scheme.requires_review,
      reason: scheme.requires_review ? scheme.flags.join("; ") : undefined,
    });
  }
  if (duty) {
    steps.push({ label: "duty", confidence: duty.confidence });
  }

  const decision = runEscalation({ threshold, steps });

  await updateClassification(classification.id, {
    aggregate_confidence: decision.aggregate_confidence,
  });
  await logAudit(shipmentId, "escalate", "escalation_decision", { decision });

  if (decision.decision === "needs_review") {
    await supabaseService().from("human_review_queue").insert({
      shipment_id: shipmentId,
      classification_id: classification.id,
      reason: decision.reasons.join(" | ") || "below confidence threshold",
      min_confidence: decision.aggregate_confidence,
      flags: scheme?.flags ?? [],
      payload: {
        hs_code: classification.hs_code,
        reasoning: classification.reasoning,
        scheme,
        duty,
      },
    });
    await setShipmentStatus(shipmentId, "needs_review", "escalate");
    return { ok: true, decision: "needs_review" };
  }

  // Auto-approved → finalize and generate documents.
  await updateClassification(classification.id, { is_final: true });
  await setShipmentStatus(shipmentId, "auto_approved", "docgen");
  await enqueueStep({ shipmentId, step: "docgen", context: {} });
  return { ok: true, decision: "auto_approved", next: "docgen" };
}

// ── docgen ─────────────────────────────────────────────────────
async function stepDocGen(shipmentId: string) {
  const shipment = await getShipment(shipmentId);
  const classification = await getOrCreateClassification(shipmentId);

  if (!classification.is_final) {
    await logAudit(
      shipmentId,
      "docgen",
      "docgen_skipped",
      { reason: "classification not final" },
      "warn",
    );
    return { ok: false, reason: "classification not final" };
  }

  const docs = await runDocGen({
    hs_code: classification.hs_code ?? "",
    product_description: shipment.product_description,
    origin_country: shipment.origin_country ?? "unknown",
    dest_country: shipment.dest_country ?? "unknown",
    scheme: (classification.scheme as CrossCheckOutput | null) ?? null,
    duty: (classification.duty as DutyOutput | null) ?? null,
  });

  await updateClassification(classification.id, { documents: docs });
  await logAudit(shipmentId, "docgen", "docgen_complete", {
    count: docs.documents.length,
  });
  await setShipmentStatus(shipmentId, "auto_approved", "done");
  return { ok: true, documents: docs.documents.length };
}
