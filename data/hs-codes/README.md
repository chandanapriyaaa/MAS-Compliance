# HS code data

## HS schedule (RAG store) — REAL

`harmonized-system.csv` is the **real WCO / UN Harmonized System nomenclature**
(6,941 lines across chapters, headings, and 6-digit subheadings — an open
dataset). It is ingested into `hs_code_docs` by:

```bash
npm run ingest:hs            # 4-digit headings (default)
INGEST_LEVEL6=1 npm run ingest:hs   # + all 6-digit subheadings (needs quota)
```

### Embeddings caveat

Semantic retrieval over ~6.8k real lines needs a real embeddings provider.
Google Gemini's **free tier is 1,000 embeddings/day**, which is not enough to
bulk-embed the full schedule, so by default the ingestion uses the built-in
**local lexical embedder** (no quota, works on Vercel, but retrieval is
lexical/trigram rather than semantic — lower accuracy). To get production-grade
semantic retrieval:

1. Set a provider with adequate quota (`EMBEDDING_PROVIDER=gemini` on a paid
   tier, or `EMBEDDING_PROVIDER=openai`).
2. Re-run `INGEST_LEVEL6=1 npm run ingest:hs`.

**The store and the runtime query must use the same embedder.** Keep
`EMBEDDING_PROVIDER` identical wherever the app runs (including Vercel); leave it
empty to use the local embedder that matches a locally-ingested store.

## Scheme & duty rates — ILLUSTRATIVE

`scheme-rates.json` and `duty-rates.json` are **hand-built sample data**
(tagged `ILLUSTRATIVE-SEED`), keyed by HS prefix. The RoDTEP / drawback / duty
figures are representative, not authoritative. Replace them with the current
**RoDTEP / Duty Drawback schedules** (DGFT) and **Customs Tariff** (CBIC) before
any real filing, and treat refreshing them as a recurring process.

`hs-seed.json` is a small curated set of real HS codes used as a lightweight,
high-quality seed (`npm run seed:hs`) for demos on a fresh/low-quota key.
