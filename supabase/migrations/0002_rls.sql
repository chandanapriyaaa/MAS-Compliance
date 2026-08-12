-- ─────────────────────────────────────────────────────────────
-- Row Level Security.
--
-- The agent pipeline runs with the SERVICE ROLE key, which bypasses RLS.
-- These policies govern the browser (anon/authenticated) client only, so
-- signed-in users see their own shipments and the shared review queue.
-- ─────────────────────────────────────────────────────────────

alter table shipments            enable row level security;
alter table classifications      enable row level security;
alter table human_review_queue   enable row level security;
alter table audit_log            enable row level security;

-- Reference + RAG tables are readable by any authenticated user.
alter table scheme_rates  enable row level security;
alter table duty_rates    enable row level security;
alter table hs_code_docs  enable row level security;

-- shipments: owner-scoped read.
drop policy if exists shipments_owner_select on shipments;
create policy shipments_owner_select on shipments
  for select using (auth.uid() = user_id);

-- classifications: readable if the parent shipment belongs to the user.
drop policy if exists classifications_owner_select on classifications;
create policy classifications_owner_select on classifications
  for select using (
    exists (
      select 1 from shipments s
      where s.id = classifications.shipment_id and s.user_id = auth.uid()
    )
  );

-- review queue: any authenticated compliance reviewer can read + update.
drop policy if exists review_authenticated_select on human_review_queue;
create policy review_authenticated_select on human_review_queue
  for select using (auth.role() = 'authenticated');

drop policy if exists review_authenticated_update on human_review_queue;
create policy review_authenticated_update on human_review_queue
  for update using (auth.role() = 'authenticated');

-- audit log: owner-scoped read.
drop policy if exists audit_owner_select on audit_log;
create policy audit_owner_select on audit_log
  for select using (
    shipment_id is null or exists (
      select 1 from shipments s
      where s.id = audit_log.shipment_id and s.user_id = auth.uid()
    )
  );

-- reference + RAG: read-only for authenticated users.
drop policy if exists scheme_rates_read on scheme_rates;
create policy scheme_rates_read on scheme_rates
  for select using (auth.role() = 'authenticated');

drop policy if exists duty_rates_read on duty_rates;
create policy duty_rates_read on duty_rates
  for select using (auth.role() = 'authenticated');

drop policy if exists hs_code_docs_read on hs_code_docs;
create policy hs_code_docs_read on hs_code_docs
  for select using (auth.role() = 'authenticated');
