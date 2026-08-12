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
      confidence: 0.2,
      source: null,
    });
  }

  const hasRodtep = row.rodtep_rate != null && row.rodtep_rate > 0;
  const hasDrawback = row.drawback_rate != null && row.drawback_rate > 0;
  const eligible = hasRodtep || hasDrawback || row.advance_auth_eligible;

  // Claimed-vs-actual mismatch detection.
  const claim = parsed.claimed_scheme;
  if (claim === "rodtep" && !hasRodtep) {
    flags.push("claimed_rodtep_but_ineligible");
  }
  if (claim === "drawback" && !hasDrawback) {
    flags.push("claimed_drawback_but_ineligible");
  }
  if (claim === "advance_authorization" && !row.advance_auth_eligible) {
    flags.push("claimed_advance_auth_but_ineligible");
  }
  if (hasRodtep && hasDrawback) {
    flags.push(
      "rodtep_and_drawback_both_present: RoDTEP and drawback are generally mutually exclusive on the same shipment — confirm which is claimed",
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
    confidence,
    source: row.source,
  });
}

function prefixConfidence(hs: string, prefix: string): number {
  const digits = normalizeHsCode(hs);
  if (!digits) return 0.3;
  const len = prefix.length;
  // 8-digit line match is strong; chapter-level (2-digit) is weak.
  if (len >= 8) return 0.95;
  if (len >= 6) return 0.85;
  if (len >= 4) return 0.7;
  return 0.5;
}
