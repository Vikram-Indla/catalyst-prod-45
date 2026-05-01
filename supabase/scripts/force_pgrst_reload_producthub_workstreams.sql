-- ────────────────────────────────────────────────────────────────────────
-- Block C follow-up (2026-05-01) — force PostgREST to expose
-- public.producthub_workstreams.
--
-- WHY: count(*) = 1 confirms the table exists, but PostgREST returns
-- PGRST205 ("Could not find the table 'public.producthub_workstreams' in
-- the schema cache") with hint "Perhaps you meant 'public.planner_workstreams'".
-- That hint proves PostgREST CAN see the public schema and just hasn't
-- picked up our new table. NOTIFY pgrst, 'reload schema' alone didn't help.
-- Lovable-hosted Supabase has no Restart-Server button, so we can't bounce
-- the process from the dashboard.
--
-- HOW: Supabase ships an event trigger called pgrst_watch that fires on
-- every ddl_command_end and issues NOTIFY pgrst, 'reload schema'. Any
-- post-commit DDL on the target table will fire it. We use COMMENT ON
-- TABLE (the cheapest no-op DDL) plus an explicit NOTIFY as a belt-and-
-- suspenders pair, plus defensive grant + permissive read policy in case
-- the original block_c_workstreams.sql RLS policy was too restrictive
-- (auth.uid() IS NOT NULL would silently filter to zero rows for the
-- anon client, but would NOT cause PGRST205 — so this is precaution).
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- AFTER: refresh /product-hub/products in the browser. INV row should
-- render with RouterLink anchor on the Key cell pointing at
-- /product-hub/INV/dashboard.
-- ────────────────────────────────────────────────────────────────────────

begin;

-- 1. Defensive grants. Supabase's default `GRANT ALL ON ALL TABLES IN
-- SCHEMA public TO anon, authenticated, service_role` should already
-- cover this, but tables created via raw SQL sometimes miss it.
grant select on public.producthub_workstreams to anon, authenticated, service_role;
grant insert, update, delete on public.producthub_workstreams to authenticated, service_role;

-- 2. Make sure RLS is on AND has a permissive read policy. If a
-- restrictive policy was created earlier, replace it with the same
-- "Anyone can read" pattern planner_workstreams uses (which is what
-- PostgREST does see and what the AllProductsPage anon-or-authenticated
-- query expects).
alter table public.producthub_workstreams enable row level security;

drop policy if exists "Anyone can read workstreams" on public.producthub_workstreams;
create policy "Anyone can read workstreams"
  on public.producthub_workstreams
  for select
  using (true);

drop policy if exists "Authenticated users can manage workstreams" on public.producthub_workstreams;
create policy "Authenticated users can manage workstreams"
  on public.producthub_workstreams
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 3. Cheap no-op DDL → fires Supabase's pgrst_watch event trigger →
-- triggers NOTIFY pgrst 'reload schema'. This is the actual fix.
comment on table public.producthub_workstreams
  is 'Product Hub workstreams — registry of products. Block C/D 2026-05-01.';

commit;

-- 4. Belt-and-suspenders: explicit NOTIFY in case pgrst_watch is
-- somehow not subscribed on this project. NOTIFY must be outside a
-- transaction to dispatch immediately.
notify pgrst, 'reload schema';

-- 5. Verify post-reload — PostgREST cache reload is async so this may
-- still show schema-cache-stale on the very first run; if so, wait
-- ~2 seconds and re-run just this block.
select
  count(*)                                                    as ws_count,
  array_agg(key order by key)                                 as keys,
  array_agg(name order by key)                                as names
from public.producthub_workstreams;
