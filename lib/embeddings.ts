import { env } from "./env";

/**
 * Embeddings.
 *
 * Groq does not serve an embeddings endpoint, so this module either calls an
 * OpenAI-compatible embeddings API (when EMBEDDING_PROVIDER=openai) or falls
 * back to a deterministic local hashing embedder for development.
 *
 * IMPORTANT: EMBEDDING_DIM must match the vector() dimension in the SQL
 * migration (hs_code_docs.embedding + match_hs_docs). If you change providers
 * to a different dimensionality, update the migration and re-seed.
 */
export const EMBEDDING_DIM = 1024;

export async function embed(text: string): Promise<number[]> {
  const [v] = await embedBatch([text]);
  return v;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = env.embeddingProvider().toLowerCase();
  if (provider === "openai") return openAiEmbed(texts);
  // Dev fallback — deterministic, no network. NOT semantically strong.
  return texts.map(hashingEmbed);
}

/** True when running on the dev-only hashing embedder. */
export function isFallbackEmbedder(): boolean {
  return env.embeddingProvider().toLowerCase() !== "openai";
}

// ── OpenAI-compatible embeddings ───────────────────────────────
async function openAiEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = env.embeddingApiKey();
  const model = env.embeddingModel() || "text-embedding-3-small";
  if (!apiKey) {
    throw new Error(
      "EMBEDDING_PROVIDER=openai but EMBEDDING_API_KEY is not set.",
    );
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts, dimensions: EMBEDDING_DIM }),
  });
  if (!res.ok) {
    throw new Error(`Embeddings API error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ── Deterministic hashing embedder (dev fallback) ──────────────
// Bag-of-character-trigrams hashed into EMBEDDING_DIM buckets, L2-normalised.
// Good enough for wiring/e2e tests; replace with a real provider for accuracy.
function hashingEmbed(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = norm.split(" ");
  for (const tok of tokens) {
    const padded = ` ${tok} `;
    for (let i = 0; i < padded.length - 2; i++) {
      const gram = padded.slice(i, i + 3);
      const h = fnv1a(gram) % EMBEDDING_DIM;
      const sign = (fnv1a("s" + gram) & 1) === 0 ? 1 : -1;
      vec[h] += sign;
    }
  }
  let mag = 0;
  for (const x of vec) mag += x * x;
  mag = Math.sqrt(mag) || 1;
  return vec.map((x) => x / mag);
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
