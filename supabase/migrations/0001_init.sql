-- ─────────────────────────────────────────────────────────────
-- Trade Compliance Copilot — initial schema
-- Postgres (Supabase). Requires the pgvector + pgcrypto extensions.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ── Enums ──────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'classification_status') then
    create type classification_status as enum (
      'pending',
      'processing',
      'auto_approved',
      'needs_review',
      'human_approved',
      'rejected',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type review_status as enum ('open', 'claimed', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_level') then
    create type audit_level as enum ('info', 'warn', 'error');
  end if;
end$$;

-- ── shipments ──────────────────────────────────────────────────
-- One row per intake. Holds the raw input, structured intake output,
-- and the live pipeline status the frontend polls.
create table if not exists shipments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users (id) on delete set null,
  product_description   text not null,
  raw_input             jsonb not null default '{}'::jsonb,
  origin_country        text,
  dest_country          text,
  structured_intake     jsonb,
  classification_status classification_status not null default 'pending',
  current_step          text not null default 'intake',
  job_id                text,
  error                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists shipments_status_idx on shipments (classification_status);
create index if not exists shipments_user_idx on shipments (user_id);

-- ── classifications ────────────────────────────────────────────
-- The evolving classification record for a shipment. Cross-check and
-- duty results are attached here as the pipeline progresses.
create table if not exists classifications (
  id                   uuid primary key default gen_random_uuid(),
  shipment_id          uuid not null references shipments (id) on delete cascade,
  hs_code              text,
  confidence_score     numeric(4, 3),        -- HS-classification confidence [0,1]
  reasoning            text,
  retrieved_sources    jsonb not null default '[]'::jsonb,
  scheme               jsonb,                -- Cross-Check Agent output
  duty                 jsonb,                -- Duty Calculator Agent output
  documents            jsonb,                -- Document Generator Agent output
  aggregate_confidence numeric(4, 3),        -- min confidence across steps
  is_final             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists classifications_shipment_idx on classifications (shipment_id);

-- ── human_review_queue ─────────────────────────────────────────
-- Escalation target. A separate dashboard view, never a blocking API path.
create table if not exists human_review_queue (
  id                uuid primary key default gen_random_uuid(),
  shipment_id       uuid not null references shipments (id) on delete cascade,
  classification_id uuid references classifications (id) on delete set null,
  reason            text not null,
  min_confidence    numeric(4, 3),
  flags             jsonb not null default '[]'::jsonb,
  payload           jsonb not null default '{}'::jsonb,  -- snapshot for the reviewer
  status            review_status not null default 'open',
  reviewer_id       uuid references auth.users (id) on delete set null,
  reviewer_notes    text,
  resolved_hs_code  text,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

create index if not exists review_status_idx on human_review_queue (status);
create index if not exists review_shipment_idx on human_review_queue (shipment_id);

-- ── audit_log ──────────────────────────────────────────────────
-- Append-only trail of every agent step + decision. Compliance evidence.
create table if not exists audit_log (
  id          bigserial primary key,
  shipment_id uuid references shipments (id) on delete cascade,
  step        text not null,
  event       text not null,
  level       audit_level not null default 'info',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_shipment_idx on audit_log (shipment_id);
create index if not exists audit_created_idx on audit_log (created_at);

-- ── Reference data: DGFT scheme rates ──────────────────────────
-- Keyed by HS-code prefix so a 2/4/6/8-digit prefix can match. The
-- Cross-Check Agent looks up the most specific matching prefix.
create table if not exists scheme_rates (
  id                     bigserial primary key,
  hs_prefix              text not null,
  description            text,
  rodtep_rate            numeric(6, 4),     -- fraction, e.g. 0.017 = 1.7%
  drawback_rate          numeric(6, 4),
  advance_auth_eligible  boolean not null default false,
  effective_from         date,
  source                 text,              -- provenance (notification no.)
  updated_at             timestamptz not null default now()
);

create index if not exists scheme_prefix_idx on scheme_rates (hs_prefix);

-- ── Reference data: duty rates ─────────────────────────────────
create table if not exists duty_rates (
  id                  bigserial primary key,
  hs_prefix           text not null,
  description         text,
  basic_customs_duty  numeric(6, 4),        -- BCD fraction of assessable value
  social_welfare_surcharge numeric(6, 4) not null default 0.10, -- 10% of BCD (typical)
  igst                numeric(6, 4),        -- IGST fraction
  notes               text,
  source              text,
  updated_at          timestamptz not null default now()
);

create index if not exists duty_prefix_idx on duty_rates (hs_prefix);

-- ── RAG store: HS schedule + past rulings ──────────────────────
-- EMBEDDING_DIM must match lib/rag.ts (default 1024). If you switch
-- embedding providers to a different dimensionality, alter this column.
create table if not exists hs_code_docs (
  id          bigserial primary key,
  hs_code     text,
  title       text,
  description text,
  content     text not null,               -- text that was embedded
  source      text not null default 'hs_schedule', -- 'hs_schedule' | 'ruling'
  metadata    jsonb not null default '{}'::jsonb,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);

-- IVFFlat index for cosine distance. Build after seeding for best recall.
create index if not exists hs_code_docs_embedding_idx
  on hs_code_docs using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists hs_code_docs_hs_idx on hs_code_docs (hs_code);
create index if not exists hs_code_docs_source_idx on hs_code_docs (source);

-- ── RAG retrieval RPC ──────────────────────────────────────────
-- Returns nearest neighbours by cosine similarity. `filter_source` NULL
-- means "any source". `similarity` is 1 - cosine_distance in [0,1].
create or replace function match_hs_docs(
  query_embedding vector(1024),
  match_count     int default 8,
  filter_source   text default null
)
returns table (
  id          bigint,
  hs_code     text,
  title       text,
  description text,
  content     text,
  source      text,
  metadata    jsonb,
  similarity  float
)
language sql stable
as $$
  select
    d.id,
    d.hs_code,
    d.title,
    d.description,
    d.content,
    d.source,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from hs_code_docs d
  where d.embedding is not null
    and (filter_source is null or d.source = filter_source)
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ── updated_at maintenance ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists shipments_set_updated_at on shipments;
create trigger shipments_set_updated_at
  before update on shipments
  for each row execute function set_updated_at();

drop trigger if exists classifications_set_updated_at on classifications;
create trigger classifications_set_updated_at
  before update on classifications
  for each row execute function set_updated_at();
