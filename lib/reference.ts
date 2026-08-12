import { supabaseService } from "./supabase";

/**
 * Reference-data lookups for the Cross-Check and Duty agents.
 *
 * Rates are keyed by HS-code *prefix*. We normalise the classified code to
 * digits and try the most specific prefix first (8 → 6 → 4 → 2 digits), so a
 * general chapter-level rate applies when no line-level rate exists.
 */

export function normalizeHsCode(hs: string): string {
  return (hs || "").replace(/\D/g, "");
}

export function prefixCandidates(hs: string): string[] {
  const digits = normalizeHsCode(hs);
  const lens = [8, 6, 4, 2];
  const out: string[] = [];
  for (const l of lens) {
    if (digits.length >= l) out.push(digits.slice(0, l));
  }
  return out;
}

export interface SchemeRow {
  hs_prefix: string;
  description: string | null;
  rodtep_rate: number | null;
  drawback_rate: number | null;
  advance_auth_eligible: boolean;
  source: string | null;
}

export async function lookupSchemeRate(hs: string): Promise<SchemeRow | null> {
  const candidates = prefixCandidates(hs);
  if (candidates.length === 0) return null;

  const { data, error } = await supabaseService()
    .from("scheme_rates")
    .select(
      "hs_prefix, description, rodtep_rate, drawback_rate, advance_auth_eligible, source",
    )
    .in("hs_prefix", candidates);
  if (error) throw new Error(`lookupSchemeRate failed: ${error.message}`);
  return mostSpecific(data ?? [], candidates);
}

export interface DutyRow {
  hs_prefix: string;
  description: string | null;
  basic_customs_duty: number | null;
  social_welfare_surcharge: number | null;
  igst: number | null;
  notes: string | null;
  source: string | null;
}

export async function lookupDutyRate(hs: string): Promise<DutyRow | null> {
  const candidates = prefixCandidates(hs);
  if (candidates.length === 0) return null;

  const { data, error } = await supabaseService()
    .from("duty_rates")
    .select(
      "hs_prefix, description, basic_customs_duty, social_welfare_surcharge, igst, notes, source",
    )
    .in("hs_prefix", candidates);
  if (error) throw new Error(`lookupDutyRate failed: ${error.message}`);
  return mostSpecific(data ?? [], candidates);
}

function mostSpecific<T extends { hs_prefix: string }>(
  rows: T[],
  candidates: string[],
): T | null {
  // candidates are ordered most-specific first.
  for (const c of candidates) {
    const hit = rows.find((r) => r.hs_prefix === c);
    if (hit) return hit;
  }
  return null;
}
