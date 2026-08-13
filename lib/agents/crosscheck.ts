import { CrossCheckInput, CrossCheckOutput } from "../schemas";
import { lookupSchemeRate, normalizeHsCode } from "../reference";

/**
 * Cross-Check Agent.
 *
 * Deterministic, grounded lookup of DGFT scheme eligibility for the classified
 * HS code — intentionally NOT an LLM call, because scheme rates are factual
 * reference data and hallucinating them has direct financial consequence.
 * Flags any mismatch between the scheme the exporter claims and what the code
 * is actually eligible for.
 */
export async function runCrossCheck(
  input: CrossCheckInput,
): Promise<CrossCheckOutput> {
  const parsed = CrossCheckInput.parse(input);
  const row = await lookupSchemeRate(parsed.hs_code);

  const flags: string[] = [];

  if (!row) {
    flags.push(
      "no_scheme_data: no DGFT scheme rate found for this HS prefix; verify manually against the latest DGFT schedule",
    );
    return CrossCheckOutput.parse({
      scheme_eligible: false,
      rodtep_rate: null,
      drawback_rate: null,
      advance_auth_eligible: false,
      matched_prefix: null,
      flags,
      requires_review: true, // missing reference data is a blocking condition
      confidence: 0.2,
      source: null,
    });
  }

  const hasRodtep = row.rodtep_rate != null && row.rodtep_rate > 0;
  const hasDrawback = row.drawback_rate != null && row.drawback_rate > 0;
  const eligible = hasRodtep || hasDrawback || row.advance_auth_eligible;

  // Claimed-vs-actual mismatch detection. These are BLOCKING — the exporter is
  // claiming a benefit the code isn't eligible for.
  let requiresReview = false;
  const claim = parsed.claimed_scheme;
  if (claim === "rodtep" && !hasRodtep) {
    flags.push("claimed_rodtep_but_ineligible");
    requiresReview = true;
  }
  if (claim === "drawback" && !hasDrawback) {
    flags.push("claimed_drawback_but_ineligible");
    requiresReview = true;
  }
  if (claim === "advance_authorization" && !row.advance_auth_eligible) {
    flags.push("claimed_advance_auth_but_ineligible");
    requiresReview = true;
  }
  // Informational only: most items publish both a RoDTEP and a drawback rate and
  // the exporter elects one. Note it, but do not force review on its own.
  if (hasRodtep && hasDrawback && claim === "none") {
    flags.push(
      "both_schemes_available: RoDTEP and drawback are both published for this code — elect one (they are generally mutually exclusive)",
    );
  }

  // Confidence tracks how specifically the prefix matched the classified code.
  const confidence = prefixConfidence(parsed.hs_code, row.hs_prefix);

  return CrossCheckOutput.parse({
    scheme_eligible: eligible,
    rodtep_rate: row.rodtep_rate,
    drawback_rate: row.drawback_rate,
    advance_auth_eligible: row.advance_auth_eligible,
    matched_prefix: row.hs_prefix,
    flags,
    requires_review: requiresReview,
    confidence,
    source: row.source,
  });
}

function prefixConfidence(hs: string, prefix: string): number {
  const digits = normalizeHsCode(hs);
  if (!digits) return 0.3;
  const len = prefix.length;
  // A heading-level (4-digit) scheme rate still applies to the whole heading,
  // so it is reasonably confident; specificity refines it upward.
  if (len >= 8) return 0.97;
  if (len >= 6) return 0.93;
  if (len >= 4) return 0.88;
  return 0.6;
}
