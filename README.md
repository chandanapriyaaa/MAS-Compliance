# Trade Compliance Copilot

A multi-agent system for Indian exporters and CHAs. It classifies HS codes,
cross-checks DGFT scheme eligibility (RoDTEP / drawback), calculates duty, and
drafts compliant documentation — **escalating low-confidence classifications to
human review instead of guessing.**

> **Non-negotiable design rule.** No HS classification or duty figure is
> auto-approved below the configured confidence threshold. Every output carries
> a confidence score; below threshold it is routed to the human review queue,
> never silently proceeding. This is a compliance tool — wrong output has real
> financial and legal consequence.

## Architecture

```
POST /api/shipment/intake  ─▶ creates shipment row, enqueues "intake", returns job_id (202)
                                    │  (QStash)
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                        │ each step is one
  /api/agents/intake ─▶ classify ─▶ crosscheck ─▶ duty ─▶ escalate ─▶ docgen
        │                                                │
        │ writes results + audit_log to Supabase         ▼
        │                                        below threshold?
        │                                     ┌───────────┴────────────┐
        │                                 auto_approved            needs_review
        │                                     │                        │
        ▼                                     ▼                        ▼
  frontend polls GET /api/shipment/[id]/status          human_review_queue (dashboard)
```

- **Frontend/API:** Next.js 14 (App Router), deployable on Vercel.
- **LLM inference:** Groq (`GROQ_MODEL`, default `llama-3.3-70b-versatile`).
- **Orchestration:** a simple custom agent chain — each agent is one typed,
  Zod-validated function in `lib/agents/`. No LangGraph.
- **Queue/state:** Upstash QStash chains each agent step across separate
  serverless invocations, so no long chain is awaited end-to-end.
- **DB + RAG:** Supabase Postgres + pgvector (`hs_code_docs`).

### Confidence is derived, not self-reported

An LLM saying "90% confident" is not a probability. The HS Classification Agent
derives confidence from **retrieval strength** (top cosine similarity of
supporting sources) + **sample agreement** (how often N independent samples land
on the same code), with self-report as a minor nudge only. Retrieval is
sufficiency-constrained: if the evidence is too weak, the agent refuses to
classify and escalates. See `lib/agents/classify.ts`.

## Project layout

```
app/
  api/shipment/intake            POST — create shipment, kick off pipeline
  api/shipment/[id]/status       GET  — poll pipeline progress
  api/agents/[step]              POST — QStash delivers each step here
  api/review/[id]/resolve        POST — human approve/reject
  dashboard/shipments            shipments table + intake form
  dashboard/review-queue         human-in-the-loop queue
lib/
  agents/                        one pure function per agent
  groq.ts schemas.ts supabase.ts qstash.ts rag.ts embeddings.ts
  reference.ts db.ts pipeline.ts env.ts
data/hs-codes/                   seed HS schedule + scheme/duty rates (ILLUSTRATIVE)
data/eval/                       hand-verified product→HS eval set
scripts/                         seed:hs, eval:classify
supabase/migrations/             0001_init.sql, 0002_rls.sql
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the values (see `.env.example` for the full list): `GROQ_API_KEY`,
Supabase URL + keys, Upstash Redis + QStash tokens. For the browser dashboard
also set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Embeddings:** Groq does not serve embeddings. Leave `EMBEDDING_PROVIDER` blank
to use the built-in deterministic hashing embedder (dev only — it makes the
pipeline runnable but retrieval quality is poor). For real accuracy set
`EMBEDDING_PROVIDER=openai` with `EMBEDDING_API_KEY` (uses 1024-dim
`text-embedding-3-small`). If you switch to a different dimension, update the
`vector(1024)` columns in `supabase/migrations/0001_init.sql` and re-seed.

### 3. Database

Run the migrations against your Supabase project (SQL editor, or the Supabase
CLI). They create the tables, the pgvector store, and the `match_hs_docs`
retrieval function.

```bash
# with the Supabase CLI
supabase db push
# or paste supabase/migrations/0001_init.sql then 0002_rls.sql into the SQL editor
```

### 4. Seed

```bash
npm run seed:hs
```

Embeds the HS seed lines into `hs_code_docs` and loads the scheme/duty
reference tables.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000/dashboard/shipments and submit a shipment. In local
mode (no public URL reachable by QStash) the pipeline chains via direct
fire-and-forget calls between steps; in production QStash delivers each step and
signatures are verified.

### 6. Evaluate before trusting

```bash
npm run eval:classify
```

Runs the classifier over `data/eval/classification-eval.json` and reports prefix
accuracy + how many cases escalated. **Build out this eval set with real DGFT
rulings before relying on classifications.**

## Deploying to Vercel

1. Import the repo, set all env vars from `.env.example` in the Vercel project.
2. Set `APP_BASE_URL` to the deployment URL so QStash callback targets resolve.
3. Configure QStash signing keys; the `/api/agents/[step]` route verifies every
   inbound delivery.
4. Run the migrations + `npm run seed:hs` against production Supabase.
5. Run the eval set end-to-end before calling it done.

## ⚠️ Data + security status (read before production)

- **Seed data is illustrative, not authoritative.** The HS lines and the
  RoDTEP / drawback / duty rates in `data/hs-codes/` are hand-built examples so
  the system runs end-to-end. Replace them with the current **ITC-HS schedule**,
  **RoDTEP/Drawback schedules**, and **Customs Tariff** before any real use, and
  treat refreshing them as a recurring process — this data goes stale.
- **npm audit:** the project pins Next.js 14 (per spec) at the latest patch
  (`14.2.35`). Some advisories are only cleared by Next 16, a major breaking
  change deliberately not taken here. Most concern the image optimizer / custom
  servers / features this app does not use. Revisit a Next 16 upgrade when ready.
- No live telephony/call agent is included (deliberately excluded).

## Known open risks (flagged per spec)

- RAG retrieval quality on HS codes is the single point of failure — needs a
  real eval set, not vibes.
- Confidence calibration: derived from retrieval + agreement, but still needs
  tuning against outcomes. `CONFIDENCE_THRESHOLD` starts at 0.85.
- DGFT scheme rates and HS schedule data will go stale — needs a refresh process.
