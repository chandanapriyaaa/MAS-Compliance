<div align="center">

# Trade Compliance Copilot

**A multi-agent decision-support platform for HS classification, DGFT scheme cross-check, duty computation, and compliant documentation — with a hard human-in-the-loop guardrail on every low-confidence output.**

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ecf8e?logo=supabase) ![Groq](https://img.shields.io/badge/LLM-Groq-f55036) ![License](https://img.shields.io/badge/license-Proprietary-lightgrey)

</div>

---

## Overview

Trade Compliance Copilot serves Indian exporters and Customs House Agents (CHAs).
It ingests a free-form product description, invoice, or spec sheet and returns a
fully-reasoned trade classification: an **HS code with a calibrated confidence
score**, **DGFT scheme eligibility** (RoDTEP / drawback / advance authorization),
an **itemised duty computation**, and **draft export paperwork**.

Every output carries provenance and a confidence score. Anything below the
configured threshold is routed to a **human review queue** rather than auto-filed.

> **Non-negotiable design rule.** No HS classification or duty figure is
> auto-approved below the confidence threshold (default `0.85`). This is a
> compliance tool: wrong output has real financial and legal consequence, so the
> system escalates instead of guessing.

                 User Input
(Product Description / Invoice / Specification Sheet)

                         ↓

              Data Extraction & Processing
   (Extract product details like material, category,
          usage, quantity, specifications)

                         ↓

                 Text Embedding Generation
     (Convert product information into numerical
              vectors for similarity search)

                         ↓

              HS Knowledge Base Retrieval
    (Search ITC-HS schedule and trade documents
           using vector similarity search)

                         ↓

              HS Code Classification Agent
   (Analyze retrieved information and identify the
             most suitable HS classification)

                         ↓

          Confidence Score Calculation
(Retrieval similarity + prediction agreement analysis)

                         ↓

              Confidence Decision Gate
             
          ┌───────────────────────┐
          │                       │
          ↓                       ↓

 Confidence ≥ 0.85          Confidence < 0.85

 Auto Approved              Human Review Queue

          ↓                       ↓

 Duty Calculation +        Manual Validation
 Scheme Eligibility             

          ↓

     Export Documentation Generation

          ↓

 Audit Log Storage & Final Output
(HS Code + Confidence + Sources + Decision Trail)

## Key features

- **Six-agent pipeline** — intake → HS classification → scheme cross-check → duty → confidence gate → documentation, each a typed, Zod-validated function.
- **Grounded, cited classification** — RAG retrieval over an HS-schedule vector store; every decision cites the sources it stands on, with similarity scores.
- **Derived confidence** — computed from retrieval strength and cross-sample agreement, not the model's self-report.
- **Human-in-the-loop** — low-confidence and scheme-mismatch cases escalate to a review queue; documents are drafted only after finalization.
- **Live operations console** — real-time shipment dashboard, an animated agent-run visualization, terminal-style logs, analytics (donut, histogram, radar, throughput), and an org-wide **audit-log search**.
- **Exports** — one-click CSV of a classification and Print/Save-as-PDF of the drafted documents.
- **Async & serverless-safe** — the agent chain is decomposed into independent, signed, retryable steps via Upstash QStash; no request awaits the full pipeline.
- **Enterprise UX** — Apple-grade design system, full light/dark theming, responsive to handheld viewports, and in-app documentation at `/docs`.

## Architecture

```
POST /api/shipment/intake
    → create shipment row (Supabase) → enqueue "intake" (QStash) → 202 job_id

  each step is one signed serverless invocation, chained by QStash:
  intake → classify → crosscheck → duty → escalate → docgen
     │        │           │          │        │         │
     └──── writes results + audit_log to Supabase ──────┘
                                     │
                          aggregate confidence (min)
                   ┌─────────────────┴──────────────────┐
              ≥ threshold                          < threshold / flagged
              auto_approved → docgen               human_review_queue
```

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 14 App Router (Vercel-ready) |
| LLM inference | Groq (Llama 3.3 70B, configurable) |
| Embeddings | Google Gemini `gemini-embedding-001` (1024-dim) |
| Orchestration | Upstash QStash (signed step chaining) |
| Database + RAG | Supabase Postgres + pgvector |
| Job state | Upstash Redis |

## Getting started

### Prerequisites

- Node.js ≥ 18.17
- A Supabase project, an Upstash (QStash + Redis) account, a Groq API key, and an embeddings key (Gemini or OpenAI-compatible).

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in the values (see [Configuration](#configuration)).

### 3. Database

Apply the SQL migrations to your Supabase project:

```bash
npm run db:migrate
```

### 4. Seed the RAG store + reference tables

```bash
npm run seed:hs
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000. Submit a shipment from the dashboard and watch the
pipeline run live.

### 6. Evaluate before trusting

```bash
npm run eval:classify
```

Runs the hand-verified evaluation set and reports prefix accuracy.

## Project structure

```
app/
  api/                    intake, status, agents/[step], review, audit, shipments
  dashboard/              shipments · review-queue · audit
  docs/                   in-app enterprise documentation
lib/
  agents/                 one pure function per agent (Zod-validated I/O)
  groq · rag · embeddings · reference · pipeline · analytics · schemas
components/
  ui/ charts/ motion/ reactbits/ docs/    design system + visualizations
supabase/migrations/      schema, RLS, RAG store + match_hs_docs RPC
data/hs-codes/            seed HS schedule + scheme/duty rates
scripts/                  db:migrate · seed:hs · eval:classify
```

## Confidence & escalation

An LLM stating "90% confident" is not a probability. The classifier derives
confidence from **retrieval strength** (top cosine similarity of supporting
sources) and **sample agreement** (how often N independent samples converge on
the same code), with self-report as a minor nudge. Retrieval is
sufficiency-constrained: if evidence is too weak, the agent refuses and
escalates. The Confidence Gate aggregates by the **minimum** across steps and
routes anything below threshold — or any claimed-scheme mismatch — to review.

## API reference

| Method / Path | Description |
|---|---|
| `POST /api/shipment/intake` | Create a shipment and start the pipeline |
| `GET /api/shipment/[id]/status` | Live pipeline status |
| `GET /api/shipment/[id]/logs` | Full audit trail + classification (drawer) |
| `GET /api/shipments` | Recent shipments joined with classification |
| `POST /api/agents/[step]` | QStash-delivered agent step (signature-verified) |
| `POST /api/review/[id]/resolve` | Human approve/reject a review item |
| `GET /api/audit` | Org-wide audit-log search |

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` / `GROQ_MODEL` | LLM inference |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Database + auth |
| `EMBEDDING_PROVIDER` / `EMBEDDING_API_KEY` / `EMBEDDING_MODEL` | RAG embeddings (`gemini` / `openai`) |
| `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | Step chaining + signature verification |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Job state |
| `CONFIDENCE_THRESHOLD` | Auto-approval bar (default `0.85`) |
| `APP_BASE_URL` | Public URL for QStash callbacks |

## Deployment

Recommended: Vercel + managed Supabase + Upstash.

1. Import the repo into Vercel; set every variable from `.env.example`.
2. Set `APP_BASE_URL` to the deployment URL so QStash callbacks resolve.
3. Run the migrations and `npm run seed:hs` against the production database.
4. Run the evaluation set end-to-end before go-live.

## Security & compliance

- **Signed steps** — every inbound agent step verifies its QStash signature (401 otherwise).
- **Least privilege** — the browser uses the publishable key under Row-Level Security; the secret key stays server-side.
- **Secrets hygiene** — no credentials committed; `.env.local` is gitignored.
- **Audit trail** — the append-only `audit_log` is the compliance evidence record, searchable org-wide.

## ⚠️ Data disclaimer

The seed HS / scheme / duty tables are an **illustrative dataset** (tagged
`ILLUSTRATIVE-SEED`). Real logic flows through them, but they must be replaced
with the authoritative **ITC-HS**, **RoDTEP/Drawback**, and **Customs Tariff**
schedules before production use, with a recurring refresh process.

## Roadmap

- Authoritative ITC-HS / DGFT / CBIC ingestion with scheduled refresh
- Confidence calibration against outcome data
- Authenticated reviewer accounts and role-based access
- Realtime status via Supabase Realtime
- Bulk intake and ERP integration

## Author

**Designed and developed by Korada Chandana Priya and Kunal Reddy**

Built with Next.js, Supabase, Groq, Google Gemini, and Upstash.

## License

Proprietary. All rights reserved.
