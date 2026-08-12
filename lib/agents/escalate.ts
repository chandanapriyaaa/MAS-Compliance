import { EscalationDecision } from "../schemas";

/**
 * Confidence + Escalation Agent.
 *
 * Aggregates confidence across prior steps by taking the MINIMUM — the chain is
 * only as trustworthy as its weakest step. If the aggregate falls below the
 * threshold (or any step flagged insufficient context), the shipment is routed
 * to human review rather than auto-approved. This is the non-negotiable
 * compliance guardrail.
 */
export interface EscalationInput {
  threshold: number;
  steps: {
    label: string;
    confidence: number;
    /** Hard escalation trigger regardless of numeric confidence. */
    forceReview?: boolean;
    reason?: string;
  }[];
}

export function runEscalation(input: EscalationInput): EscalationDecision {
  const { threshold, steps } = input;

  let minStep = "none";
  let minConf = 1;
  const reasons: string[] = [];

  for (const s of steps) {
    if (s.confidence < minConf) {
      minConf = s.confidence;
      minStep = s.label;
    }
    if (s.forceReview) {
      reasons.push(`${s.label}: ${s.reason ?? "forced review"}`);
    }
  }

  const belowThreshold = minConf < threshold;
  if (belowThreshold) {
    reasons.push(
      `aggregate confidence ${minConf.toFixed(3)} < threshold ${threshold.toFixed(
        2,
      )} (weakest: ${minStep})`,
    );
  }

  const decision =
    belowThreshold || reasons.length > 0 ? "needs_review" : "auto_approved";

  return EscalationDecision.parse({
    aggregate_confidence: Math.round(minConf * 1000) / 1000,
    threshold,
    decision,
    min_step: minStep,
    reasons,
  });
}
