import { completeJson } from "../groq";
import { retrieveHsDocs, type RagHit } from "../rag";
import {
  ClassificationModelOutput,
  ClassificationOutput,
  type IntakeOutput,
  type RetrievedSource,
} from "../schemas";
import { normalizeHsCode } from "../reference";

/**
 * HS Classification Agent.
 *
 * Confidence is DERIVED, not self-reported. As the spec's open risks note, an
 * LLM saying "90% confident" is not a probability. We instead combine:
 *   1. retrieval strength  — top cosine similarity of supporting sources
 *   2. sample agreement    — how often N independent samples land on the same code
 *   3. self-report (minor) — a small nudge only
 * Sufficiency-constrained retrieval gates the whole thing: if retrieval is too
 * weak, we return insufficient_context and a low score so escalation fires.
 */

const SAMPLES = 3;

export interface ClassifyContext {
  productDescription: string;
  intake: IntakeOutput;
}

export async function runClassify(
  ctx: ClassifyContext,
): Promise<ClassificationOutput> {
  const query = buildQuery(ctx);
  const retrieval = await retrieveHsDocs(query, {
    matchCount: 8,
    sufficiencyFloor: 0.35,
    minSufficient: 1,
  });

  const retrievedSources: RetrievedSource[] = retrieval.hits.map((h) => ({
    hs_code: h.hs_code,
    title: h.title,
    source: h.source,
    similarity: h.similarity,
    snippet: h.snippet,
  }));

  // Sufficiency gate: refuse to classify against weak evidence.
  if (!retrieval.sufficient) {
    return ClassificationOutput.parse({
      hs_code: "",
      confidence_score: 0,
      reasoning:
        "Retrieved HS-schedule context did not sufficiently support a classification. Routing to human review rather than guessing.",
      retrieved_sources: retrievedSources,
      insufficient_context: true,
      signals: {
        top_similarity: retrieval.topSimilarity,
        sample_agreement: 0,
        self_reported: 0,
        samples: [],
      },
    });
  }

  const system = classifierSystemPrompt();
  const user = classifierUserPrompt(ctx, retrieval.hits);

  // N independent samples with a little temperature to expose disagreement.
  const samples: ClassificationModelOutput[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const out = await completeJson({
      system,
      user,
      schema: ClassificationModelOutput,
      temperature: i === 0 ? 0.1 : 0.5,
    });
    samples.push(out);
  }

  const codes = samples.map((s) => normalizeHsCode(s.hs_code)).filter(Boolean);
  const { mode, agreement } = modal(codes);

  // If the model flagged insufficient context in the majority of samples, escalate.
  const insufficientVotes = samples.filter((s) => s.insufficient_context).length;
  if (!mode || insufficientVotes > SAMPLES / 2) {
    return ClassificationOutput.parse({
      hs_code: mode ?? "",
      confidence_score: 0,
      reasoning:
        samples[0]?.reasoning ??
        "Model reported insufficient context to classify confidently.",
      retrieved_sources: retrievedSources,
      insufficient_context: true,
      signals: {
        top_similarity: retrieval.topSimilarity,
        sample_agreement: agreement,
        self_reported: avg(samples.map((s) => s.self_reported_confidence)),
        samples: codes,
      },
    });
  }

  // Representative sample = one that produced the modal code.
  const rep =
    samples.find((s) => normalizeHsCode(s.hs_code) === mode) ?? samples[0];

  const selfReported = avg(samples.map((s) => s.self_reported_confidence));
  const confidence = deriveConfidence({
    topSimilarity: retrieval.topSimilarity,
    agreement,
    selfReported,
  });

  return ClassificationOutput.parse({
    hs_code: rep.hs_code,
    confidence_score: confidence,
    reasoning: rep.reasoning,
    retrieved_sources: retrievedSources,
    insufficient_context: false,
    signals: {
      top_similarity: retrieval.topSimilarity,
      sample_agreement: agreement,
      self_reported: selfReported,
      samples: codes,
    },
  });
}

// ── Confidence derivation ──────────────────────────────────────
// Retrieval strength and sample agreement dominate; self-report is a minor
// nudge. Similarity is mapped through a soft target so ~0.6 cosine reads as
// "strong". All weights are deliberately explicit for calibration/tuning.
export function deriveConfidence(sig: {
  topSimilarity: number;
  agreement: number;
  selfReported: number;
}): number {
  const simScore = clamp01(sig.topSimilarity / 0.6);
  const raw =
    0.45 * simScore + 0.45 * sig.agreement + 0.1 * clamp01(sig.selfReported);
  return Math.round(clamp01(raw) * 1000) / 1000;
}

// ── Prompt builders ────────────────────────────────────────────
function buildQuery(ctx: ClassifyContext): string {
  const { intake, productDescription } = ctx;
  return [
    productDescription,
    `Material: ${intake.material}`,
    `Function: ${intake.function}`,
    `Use case: ${intake.use_case}`,
    Object.entries(intake.attributes ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("; "),
  ]
    .filter(Boolean)
    .join(". ");
}

function classifierSystemPrompt(): string {
  return [
    "You are the HS Classification Agent for Indian customs (ITC-HS).",
    "Classify the product using ONLY the numbered reference sources provided.",
    "Ground your answer: cite the source ids you relied on in used_source_ids.",
    "If the sources do not clearly support a specific code, set insufficient_context=true and do not force a code.",
    "Return JSON with: hs_code (digits, 6 or 8 digit preferred), self_reported_confidence (0-1), reasoning, used_source_ids (array of numbers), insufficient_context (boolean).",
  ].join(" ");
}

function classifierUserPrompt(ctx: ClassifyContext, hits: RagHit[]): string {
  const sources = hits
    .map(
      (h, i) =>
        `[${i}] (id=${h.id}, sim=${h.similarity.toFixed(3)}, hs=${
          h.hs_code ?? "?"
        }, src=${h.source}) ${h.title ?? ""} — ${h.snippet}`,
    )
    .join("\n");

  return [
    "PRODUCT:",
    buildQuery(ctx),
    "",
    "REFERENCE SOURCES:",
    sources || "(none retrieved)",
  ].join("\n");
}

// ── Small stats helpers ────────────────────────────────────────
function modal(values: string[]): { mode: string | null; agreement: number } {
  if (values.length === 0) return { mode: null, agreement: 0 };
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let mode: string | null = null;
  let best = 0;
  for (const [k, c] of counts) {
    if (c > best) {
      best = c;
      mode = k;
    }
  }
  return { mode, agreement: best / values.length };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
