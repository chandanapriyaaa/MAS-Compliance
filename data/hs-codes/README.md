# HS code seed data

**⚠️ Illustrative sample data — NOT authoritative.**

The JSON files here are a small, hand-built seed set so the pipeline is runnable
end-to-end. The HS codes, RoDTEP/drawback rates, and duty rates are
*representative examples* and **must not** be relied on for real filings. Before
production use, replace them with:

- the current **ITC-HS schedule** (DGFT) for `hs-seed.json`,
- the current **RoDTEP / Duty Drawback schedules** (DGFT/CBIC) for `scheme-rates.json`,
- the current **Customs Tariff** (CBIC) for `duty-rates.json`.

As the spec's open risks note, this data goes stale — treat refreshing it as a
recurring process, not a one-time seed.

## Files

- `hs-seed.json` — HS lines embedded into `hs_code_docs` for RAG retrieval.
- `scheme-rates.json` — DGFT scheme eligibility keyed by HS prefix.
- `duty-rates.json` — import-duty components keyed by HS prefix.

Ingest with:

```bash
npm run seed:hs
```
