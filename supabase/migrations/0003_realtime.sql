-- ─────────────────────────────────────────────────────────────
-- Realtime: stream shipment / classification / audit changes to the browser.
--
-- Auth is not wired yet, so the browser client (publishable key = anon role)
-- needs read access for Realtime to deliver rows. These permissive SELECT
-- policies open reads to anon FOR NOW; tighten them when authentication lands.
-- ─────────────────────────────────────────────────────────────

-- Enable Realtime on the relevant tables (idempotent).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

do $$ begin alter publication supabase_realtime add table shipments;          exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table classifications;    exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table human_review_queue; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table audit_log;          exception when others then null; end $$;

-- Permissive anon read (temporary, pre-auth).
drop policy if exists anon_read_shipments on shipments;
create policy anon_read_shipments on shipments for select using (true);

drop policy if exists anon_read_classifications on classifications;
create policy anon_read_classifications on classifications for select using (true);

drop policy if exists anon_read_review on human_review_queue;
create policy anon_read_review on human_review_queue for select using (true);

drop policy if exists anon_read_audit on audit_log;
create policy anon_read_audit on audit_log for select using (true);
