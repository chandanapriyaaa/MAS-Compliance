/**
 * Run the HS Classification Agent over the hand-verified eval set and report
 * prefix accuracy + confidence calibration.
 *
 *   npm run eval:classify
 *
 * As the spec insists: build the eval set BEFORE trusting the classifier, and
 * expand it with real rulings over time. This script is the guardrail.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runIntake } from "../lib/agents/intake";
import { runClassify } from "../lib/agents/classify";
import { normalizeHsCode } from "../lib/reference";

loadEnvLocal();

interface EvalCase {
  id: string;
  product_description: string;
  origin_country?: string;
  dest_country?: string;
  expected_prefix: string;
}

async function main() {
  const path = resolve(process.cwd(), "data", "eval", "classification-eval.json");
  const set = JSON.parse(readFileSync(path, "utf-8")) as {
    match_digits: number;
    cases: EvalCase[];
  };
  const matchDigits = set.match_digits ?? 4;

  let correct = 0;
  let escalated = 0;
  const rows: string[] = [];

  for (const c of set.cases) {
    const intake = await runIntake({
      shipmentId: "00000000-0000-0000-0000-000000000000",
      productDescription: c.product_description,
      rawInput: {},
      originCountry: c.origin_country,
      destCountry: c.dest_country,
    });
    const result = await runClassify({
      productDescription: c.product_description,
      intake,
    });

    const predicted = normalizeHsCode(result.hs_code).slice(0, matchDigits);
    const expected = normalizeHsCode(c.expected_prefix).slice(0, matchDigits);
    const hit = predicted !== "" && predicted === expected;
    if (hit) correct++;
    if (result.insufficient_context) escalated++;

    rows.push(
      `${c.id}  exp=${expected}  got=${predicted || "—"}  conf=${result.confidence_score
        .toFixed(3)}  ${hit ? "✓" : result.insufficient_context ? "↑esc" : "✗"}`,
    );
  }

  const total = set.cases.length;
  console.log(rows.join("\n"));
  console.log("\n──────────────────────────────");
  console.log(`Accuracy (top-${matchDigits} prefix): ${correct}/${total} = ${(
    (correct / total) *
    100
  ).toFixed(1)}%`);
  console.log(`Escalated (insufficient context):     ${escalated}/${total}`);
  console.log(
    "\nNote: with the dev hashing embedder, accuracy will be low. Set a real embeddings provider and re-run.",
  );
}

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
