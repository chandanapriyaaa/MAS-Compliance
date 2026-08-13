/**
 * Seed the RAG store + reference tables from data/hs-codes/*.json.
 *
 *   npm run seed:hs
 *
 * Idempotent: clears seed rows first, then re-inserts. Embeds each HS line's
 * title+description with the configured embedder (falls back to the dev
 * hashing embedder if EMBEDDING_PROVIDER is unset — fine for wiring, weak for
 * real accuracy).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { supabaseService } from "../lib/supabase";
import { embedBatch, isFallbackEmbedder } from "../lib/embeddings";

// Load .env.local explicitly (dotenv/config only reads .env).
loadEnvLocal();

interface HsSeed {
  hs_code: string;
  title: string;
  description: string;
}

async function main() {
  const dir = resolve(process.cwd(), "data", "hs-codes");
  const hs: HsSeed[] = readJson(resolve(dir, "hs-seed.json"));
  const schemes = readJson<any[]>(resolve(dir, "scheme-rates.json"));
  const duties = readJson<any[]>(resolve(dir, "duty-rates.json"));

  const svc = supabaseService();

  if (isFallbackEmbedder()) {
    console.warn(
      "⚠️  Using the DEV hashing embedder (EMBEDDING_PROVIDER unset). Retrieval quality will be poor — set a real embeddings provider before trusting classifications.",
    );
  }

  // ── HS docs (RAG) ──
  console.log(`Embedding ${hs.length} HS lines…`);
  const texts = hs.map((h) => `${h.hs_code} ${h.title}. ${h.description}`);
  const embeddings = await embedPaced(texts);

  console.log("Clearing existing hs_schedule docs…");
  await svc.from("hs_code_docs").delete().eq("source", "hs_schedule");

  const rows = hs.map((h, i) => ({
    hs_code: h.hs_code,
    title: h.title,
    description: h.description,
    content: texts[i],
    source: "hs_schedule",
    metadata: {},
    embedding: embeddings[i],
  }));
  const { error: docErr } = await svc.from("hs_code_docs").insert(rows);
  if (docErr) throw new Error(`insert hs_code_docs failed: ${docErr.message}`);
  console.log(`✓ Inserted ${rows.length} HS docs.`);

  // ── scheme_rates ──
  console.log("Reseeding scheme_rates…");
  await svc.from("scheme_rates").delete().neq("id", -1);
  const { error: schemeErr } = await svc.from("scheme_rates").insert(schemes);
  if (schemeErr) throw new Error(`insert scheme_rates failed: ${schemeErr.message}`);
  console.log(`✓ Inserted ${schemes.length} scheme rows.`);

  // ── duty_rates ──
  console.log("Reseeding duty_rates…");
  await svc.from("duty_rates").delete().neq("id", -1);
  const { error: dutyErr } = await svc.from("duty_rates").insert(duties);
  if (dutyErr) throw new Error(`insert duty_rates failed: ${dutyErr.message}`);
  console.log(`✓ Inserted ${duties.length} duty rows.`);

  console.log("Done.");
}

function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Embed in small paced batches with 429 backoff, to fit low free-tier limits. */
async function embedPaced(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const B = 8;
  for (let i = 0; i < texts.length; i += B) {
    const chunk = texts.slice(i, i + B);
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        out.push(...(await embedBatch(chunk)));
        break;
      } catch (err) {
        const msg = String(err);
        const limited = msg.includes("429") || /rate|quota|resource/i.test(msg);
        if (limited && attempt < 8) {
          const wait = Math.min(60000, 20000 + 6000 * attempt);
          console.warn(`  rate-limited, retrying in ${wait}ms…`);
          await sleep(wait);
          attempt++;
          continue;
        }
        throw err;
      }
    }
    if (i + B < texts.length) await sleep(5000);
  }
  return out;
}

function loadEnvLocal() {
  try {
    const path = resolve(process.cwd(), ".env.local");
    const content = readFileSync(path, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local optional; env may come from the shell.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
