import { supabaseService } from "./supabase";
import { embed } from "./embeddings";
import type { RetrievedSource } from "./schemas";

/**
 * Retrieval against the pgvector HS-code store.
 *
 * Implements a *sufficiency-constrained* retrieval pass (the SCG-RAG idea):
 * we don't just return top-k blindly — we surface a sufficiency signal so the
 * classifier can refuse to answer when the retrieved evidence is too weak,
 * rather than confidently classifying against irrelevant context.
 */

export interface RagHit extends RetrievedSource {
  id: number;
  content: string;
}

export interface RetrievalResult {
  hits: RagHit[];
  /** Highest similarity among returned hits, in [0,1]. */
  topSimilarity: number;
  /** Count of hits above the sufficiency floor. */
  sufficientCount: number;
  /** Whether retrieval cleared the sufficiency bar. */
  sufficient: boolean;
}

export interface RetrieveOptions {
  matchCount?: number;
  /** Similarity floor below which a hit is considered non-supporting. */
  sufficiencyFloor?: number;
  /** Minimum number of above-floor hits required to call retrieval sufficient. */
  minSufficient?: number;
  source?: "hs_schedule" | "ruling" | null;
}

export async function retrieveHsDocs(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievalResult> {
  const {
    matchCount = 8,
    sufficiencyFloor = 0.35,
    minSufficient = 1,
    source = null,
  } = opts;

  const queryEmbedding = await embed(query);

  const { data, error } = await supabaseService().rpc("match_hs_docs", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_source: source,
  });

  if (error) {
    throw new Error(`RAG retrieval failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: number;
    hs_code: string | null;
    title: string | null;
    description: string | null;
    content: string;
    source: string;
    similarity: number;
  }>;

  const hits: RagHit[] = rows.map((r) => ({
    id: r.id,
    hs_code: r.hs_code,
    title: r.title,
    source: r.source,
    similarity: r.similarity,
    content: r.content,
    snippet: (r.description ?? r.content ?? "").slice(0, 280),
  }));

  const topSimilarity = hits.length ? hits[0].similarity : 0;
  const sufficientCount = hits.filter(
    (h) => h.similarity >= sufficiencyFloor,
  ).length;

  return {
    hits,
    topSimilarity,
    sufficientCount,
    sufficient: sufficientCount >= minSufficient,
  };
}
