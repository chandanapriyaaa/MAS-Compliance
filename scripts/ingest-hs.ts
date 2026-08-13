/**
 * Ingest the real Harmonized System nomenclature (WCO/UN open dataset) into the
 * pgvector RAG store, replacing the illustrative seed.
 *
 *   npm run ingest:hs
 *
 * Reads data/hs-codes/harmonized-system.csv (columns: section, hscode,
 * description, parent, level), keeps the 4- and 6-digit lines, enriches each
 * with its parent heading for better retrieval, embeds in batches with
 * rate-limit backoff, and inserts into hs_code_docs.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { supabaseService } from "../lib/supabase";
import { embedBatch, isFallbackEmbedder } from "../lib/embeddings";

loadEnvLocal();

// Local embedder is instant with no quota; a remote provider needs small,
// paced batches (see git history). These defaults suit the local embedder.
const EMBED_BATCH = Number(process.env.EMBED_BATCH ?? 500);
const INSERT_BATCH = 500;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS ?? 0);
// Levels to ingest: 4 = headings (complete nomenclature), 6 = subheadings.
// Free-tier embedding RPM is low, so default to headings only; set INGEST_LEVEL6=1
// (with a higher-quota key) to also embed all 6-digit subheadings.
const LEVELS = process.env.INGEST_LEVEL6 ? [4, 6] : [4];

async function main() {
  const csv = readFileSync(
    resolve(process.cwd(), "data", "hs-codes", "harmonized-system.csv"),
    "utf-8",
  );
  const rows = parseCsv(csv);
  const header = rows.shift()!;
  const col = (name: string) => header.indexOf(name);
  const iCode = col("hscode");
  const iDesc = col("description");
  const iParent = col("parent");
  const iLevel = col("level");

  const byCode = new Map<string, string>();
  for (const r of rows) byCode.set(r[iCode], r[iDesc]);

  type Doc = { hs_code: string; title: string; content: string; level: number };
  const docs: Doc[] = [];
  for (const r of rows) {
    const level = Number(r[iLevel]);
    if (!LEVELS.includes(level)) continue;
    const code = r[iCode];
    const desc = r[iDesc];
    const parentDesc = byCode.get(r[iParent]);
    const content = parentDesc
      ? `HS ${code}: ${desc}. (${parentDesc})`
      : `HS ${code}: ${desc}`;
    docs.push({ hs_code: code, title: desc, content, level });
  }

  console.log(`Parsed ${docs.length} HS lines (4- and 6-digit).`);
  if (isFallbackEmbedder()) {
    console.warn("⚠️  Using the DEV hashing embedder — set EMBEDDING_PROVIDER=gemini for real retrieval.");
  }

  const svc = supabaseService();
  console.log("Clearing existing hs_schedule docs…");
  await svc.from("hs_code_docs").delete().eq("source", "hs_schedule");

  let pending: any[] = [];
  let done = 0;
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    const chunk = docs.slice(i, i + EMBED_BATCH);
    const vectors = await embedWithRetry(chunk.map((d) => d.content));
    await sleep(BATCH_DELAY_MS);
    for (let j = 0; j < chunk.length; j++) {
      pending.push({
        hs_code: chunk[j].hs_code,
        title: chunk[j].title,
        description: chunk[j].title,
        content: chunk[j].content,
        source: "hs_schedule",
        metadata: { level: chunk[j].level },
        embedding: vectors[j],
      });
    }
    if (pending.length >= INSERT_BATCH) {
      await insert(svc, pending);
      done += pending.length;
      pending = [];
      console.log(`  inserted ${done}/${docs.length}`);
    }
  }
  if (pending.length) {
    await insert(svc, pending);
    done += pending.length;
  }
  console.log(`✓ Ingested ${done} real HS lines.`);
}

async function insert(svc: ReturnType<typeof supabaseService>, rows: any[]) {
  const { error } = await svc.from("hs_code_docs").insert(rows);
  if (error) throw new Error(`insert failed: ${error.message}`);
}

async function embedWithRetry(texts: string[], attempt = 0): Promise<number[][]> {
  try {
    return await embedBatch(texts);
  } catch (err) {
    const msg = String(err);
    const rateLimited = msg.includes("429") || /rate|quota|resource/i.test(msg);
    if (attempt < 8 && rateLimited) {
      const wait = Math.min(60000, 22000 + 6000 * attempt);
      console.warn(`  rate-limited, retrying in ${wait}ms…`);
      await sleep(wait);
      return embedWithRetry(texts, attempt + 1);
    }
    throw err;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Minimal RFC-4180 CSV parser (handles quoted fields with commas/newlines).
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
