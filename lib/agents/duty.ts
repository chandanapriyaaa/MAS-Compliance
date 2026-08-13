import { DutyInput, DutyOutput } from "../schemas";
import { lookupDutyRate, normalizeHsCode } from "../reference";

/**
 * Duty Calculator Agent.
 *
 * Deterministic computation from grounded reference rates. Models the standard
 * Indian import-duty stack on the assessable value:
 *   BCD  = value * basic_customs_duty
 *   SWS  = BCD   * social_welfare_surcharge   (surcharge on the BCD)
 *   IGST = (value + BCD + SWS) * igst          (levied on value + BCD + SWS)
 *   total = BCD + SWS + IGST
 * Rates come from the duty_rates reference table, never from the LLM.
 */
export async function runDuty(input: DutyInput): Promise<DutyOutput> {
  const parsed = DutyInput.parse(input);
  const row = await lookupDutyRate(parsed.hs_code);
  const value = parsed.assessable_value;

  if (!row) {
    return DutyOutput.parse({
      duty_amount: 0,
      duty_rate: 0,
      currency: parsed.currency,
      breakdown: [],
      matched_prefix: null,
      confidence: 0.2,
      source: null,
      notes:
        "No duty rate found for this HS prefix; duty could not be computed. Verify against the latest customs tariff.",
    });
  }

  const bcdRate = row.basic_customs_duty ?? 0;
  const swsRate = row.social_welfare_surcharge ?? 0.1;
  const igstRate = row.igst ?? 0;

  const bcd = round2(value * bcdRate);
  const sws = round2(bcd * swsRate);
  const igstBase = value + bcd + sws;
  const igst = round2(igstBase * igstRate);
  const total = round2(bcd + sws + igst);

  const breakdown = [
    { label: "Basic Customs Duty (BCD)", rate: bcdRate, amount: bcd },
    { label: "Social Welfare Surcharge (on BCD)", rate: swsRate, amount: sws },
    { label: "IGST (on value + BCD + SWS)", rate: igstRate, amount: igst },
  ];

  return DutyOutput.parse({
    duty_amount: total,
    duty_rate: value > 0 ? round4(total / value) : 0,
    currency: parsed.currency,
    breakdown,
    matched_prefix: row.hs_prefix,
    confidence: prefixConfidence(parsed.hs_code, row.hs_prefix),
    source: row.source,
    notes: row.notes ?? "",
  });
}

function prefixConfidence(hs: string, prefix: string): number {
  const digits = normalizeHsCode(hs);
  if (!digits) return 0.3;
  const len = prefix.length;
  if (len >= 8) return 0.97;
  if (len >= 6) return 0.93;
  if (len >= 4) return 0.88;
  return 0.6;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
