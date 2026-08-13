import { z } from "zod";

/**
 * Zod schemas for every agent input/output.
 *
 * These are the single source of truth for the shapes that flow through the
 * pipeline. Agent functions validate their output against these before
 * returning, so a malformed LLM response fails loudly rather than silently
 * corrupting downstream steps.
 */

// ── Shared primitives ──────────────────────────────────────────
export const Confidence = z.number().min(0).max(1);

export const countryCode = z
  .string()
  .trim()
  .min(2)
  .max(56)
  .describe("ISO country name or 2-letter code");

// ── Pipeline step identifiers ──────────────────────────────────
export const PIPELINE_STEPS = [
  "intake",
  "classify",
  "crosscheck",
  "duty",
  "escalate",
  "docgen",
] as const;
export const PipelineStep = z.enum(PIPELINE_STEPS);
export type PipelineStep = z.infer<typeof PipelineStep>;

// ── Intake Agent ───────────────────────────────────────────────
export const IntakeInput = z.object({
  shipmentId: z.string().uuid(),
  productDescription: z.string().min(1),
  // Free-form extra context: invoice text, spec-sheet excerpts, HS hints.
  rawInput: z.record(z.unknown()).default({}),
  originCountry: countryCode.optional(),
  destCountry: countryCode.optional(),
});
export type IntakeInput = z.infer<typeof IntakeInput>;

export const IntakeOutput = z.object({
  material: z.string().describe("Primary material(s) of the good"),
  function: z.string().describe("What the good does / its purpose"),
  use_case: z.string().describe("End-use or application context"),
  origin_country: z.string(),
  dest_country: z.string(),
  // Anything the model extracted but that doesn't fit the fixed fields.
  attributes: z.record(z.string()).default({}),
  notes: z.string().default(""),
});
export type IntakeOutput = z.infer<typeof IntakeOutput>;

// ── HS Classification Agent ────────────────────────────────────
export const RetrievedSource = z.object({
  hs_code: z.string().nullable(),
  title: z.string().nullable(),
  source: z.string(),
  similarity: z.number(),
  snippet: z.string().default(""),
});
export type RetrievedSource = z.infer<typeof RetrievedSource>;

// What the LLM is asked to return (raw model output).
export const ClassificationModelOutput = z.object({
  hs_code: z
    .string()
    .describe("Best HS code (6 or 8 digit) as digits, may include dots"),
  self_reported_confidence: Confidence.describe(
    "Model's own confidence — NOT trusted directly; used as one signal only",
  ),
  reasoning: z.string(),
  // The model must ground its answer in retrieved sources it actually used.
  used_source_ids: z.array(z.number()).default([]),
  insufficient_context: z
    .boolean()
    .default(false)
    .describe("True when retrieved sources do not support any confident answer"),
});
export type ClassificationModelOutput = z.infer<
  typeof ClassificationModelOutput
>;

// The full agent output after we derive a calibrated confidence.
export const ClassificationOutput = z.object({
  hs_code: z.string(),
  confidence_score: Confidence.describe(
    "Calibrated confidence: derived from retrieval score + sample agreement, not raw self-report",
  ),
  reasoning: z.string(),
  retrieved_sources: z.array(RetrievedSource),
  insufficient_context: z.boolean().default(false),
  // Diagnostics from confidence derivation.
  signals: z
    .object({
      top_similarity: z.number(),
      sample_agreement: z.number(),
      self_reported: z.number(),
      samples: z.array(z.string()).default([]),
    })
    .optional(),
});
export type ClassificationOutput = z.infer<typeof ClassificationOutput>;

// ── Cross-Check Agent ──────────────────────────────────────────
export const CrossCheckInput = z.object({
  hs_code: z.string(),
  origin_country: z.string(),
  dest_country: z.string(),
  // Scheme the exporter *claims* to be using, if any, so we can flag mismatch.
  claimed_scheme: z
    .enum(["rodtep", "drawback", "advance_authorization", "none"])
    .default("none"),
});
export type CrossCheckInput = z.infer<typeof CrossCheckInput>;

export const CrossCheckOutput = z.object({
  scheme_eligible: z.boolean(),
  rodtep_rate: z.number().nullable(),
  drawback_rate: z.number().nullable(),
  advance_auth_eligible: z.boolean(),
  matched_prefix: z.string().nullable(),
  flags: z.array(z.string()).default([]),
  // True only for BLOCKING flags (claimed-scheme mismatch, missing data) that
  // must force human review — not for informational notes.
  requires_review: z.boolean().default(false),
  confidence: Confidence,
  source: z.string().nullable(),
});
export type CrossCheckOutput = z.infer<typeof CrossCheckOutput>;

// ── Duty Calculator Agent ──────────────────────────────────────
export const DutyInput = z.object({
  hs_code: z.string(),
  origin_country: z.string(),
  dest_country: z.string(),
  assessable_value: z
    .number()
    .positive()
    .describe("Customs assessable value in destination currency"),
  currency: z.string().default("INR"),
});
export type DutyInput = z.infer<typeof DutyInput>;

export const DutyOutput = z.object({
  duty_amount: z.number(),
  duty_rate: z.number().describe("Effective total duty as a fraction of value"),
  currency: z.string(),
  breakdown: z.array(
    z.object({
      label: z.string(),
      rate: z.number(),
      amount: z.number(),
    }),
  ),
  matched_prefix: z.string().nullable(),
  confidence: Confidence,
  source: z.string().nullable(),
  notes: z.string().default(""),
});
export type DutyOutput = z.infer<typeof DutyOutput>;

// ── Confidence + Escalation Agent ──────────────────────────────
export const EscalationDecision = z.object({
  aggregate_confidence: Confidence,
  threshold: Confidence,
  decision: z.enum(["auto_approved", "needs_review"]),
  min_step: z.string(),
  reasons: z.array(z.string()).default([]),
});
export type EscalationDecision = z.infer<typeof EscalationDecision>;

// ── Document Generator Agent ───────────────────────────────────
export const DocGenInput = z.object({
  hs_code: z.string(),
  product_description: z.string(),
  origin_country: z.string(),
  dest_country: z.string(),
  scheme: CrossCheckOutput.nullable(),
  duty: DutyOutput.nullable(),
  doc_types: z
    .array(z.enum(["commercial_invoice", "packing_list", "lc_language"]))
    .default(["commercial_invoice", "packing_list", "lc_language"]),
});
export type DocGenInput = z.infer<typeof DocGenInput>;

export const DocGenOutput = z.object({
  documents: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      body: z.string(),
    }),
  ),
  disclaimer: z.string(),
});
export type DocGenOutput = z.infer<typeof DocGenOutput>;

// ── Intake API request (public boundary) ───────────────────────
export const IntakeRequest = z.object({
  product_description: z.string().min(1, "product_description is required"),
  origin_country: countryCode.optional(),
  dest_country: countryCode.optional(),
  assessable_value: z.number().positive().optional(),
  currency: z.string().default("INR"),
  claimed_scheme: z
    .enum(["rodtep", "drawback", "advance_authorization", "none"])
    .default("none"),
  raw_input: z.record(z.unknown()).default({}),
});
export type IntakeRequest = z.infer<typeof IntakeRequest>;

// ── QStash step message envelope ───────────────────────────────
export const StepMessage = z.object({
  shipmentId: z.string().uuid(),
  step: PipelineStep,
  // Carried context so each serverless step is self-contained.
  context: z.record(z.unknown()).default({}),
});
export type StepMessage = z.infer<typeof StepMessage>;
