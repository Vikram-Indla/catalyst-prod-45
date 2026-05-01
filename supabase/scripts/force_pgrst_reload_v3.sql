-- ────────────────────────────────────────────────────────────────────────
-- Block C follow-up v3 (2026-05-01) — install pgrst_watch trigger if
-- it's missing on this Lovable-hosted Supabase project.
--
-- v1 (COMMENT) and v2 (ADD/DROP COLUMN) both ran clean but PostgREST
-- still returns PGRST205. That's only possible if no DDL listener is
-- subscribed to fire NOTIFY pgrst, 'reload schema'. Standard Supabase
-- ships an event trigger named pgrst_watch that does this automatically;
-- if Lovable's project doesn't have it, we install it here.
--
-- This is the canonical PostgREST schema-reload trigger — exactly what
-- Supabase ships by default. Installing it is idempotent.
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- AFTER: refresh /product-hub/products. INV row should appear.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Diagnostic — confirm what's installed before we touch anything.
select
  evtname        as event_trigger_name,
  evtevent       as fires_on,
  evtenabled     as enabled
from pg_event_trigger
order by evtname;

-- 2. Function that PostgREST listens for. NOTIFY on the 'pgrst' channel
-- with 'reload schema' is what triggers the schema cache rebuild.
create or replace function public.pgrst_watch()
returns event_trigger
language plpgsql
as $$
begin
  notify pgrst, 'reload schema';
end;
$$;

-- 3. Bind the function to ddl_command_end. Idempotent: drop-then-create.
drop event trigger if exists pgrst_watch;

create event trigger pgrst_watch
  on ddl_command_end
  execute procedure public.pgrst_watch();

-- 4. Now fire a real DDL change to actually invoke the freshly-installed
-- trigger. ADD then DROP a no-op column on producthub_workstreams.
alter table public.producthub_workstreams
  add column _pgrst_force_reload_v3 text default null;

alter table public.producthub_workstreams
  drop column _pgrst_force_reload_v3;

-- 5. Belt-and-suspenders explicit notify (outside any transaction).
notify pgrst, 'reload schema';

-- 6. Verify the trigger is now installed.
select
  evtname        as event_trigger_name,
  evtevent       as fires_on,
  evtenabled     as enabled,
  evtfoid::regprocedure as function_signature
from pg_event_trigger
where evtname = 'pgrst_watch';

-- 7. Verify the row is still there.
select
  count(*)                          as ws_count,
  array_agg(key   order by key)     as keys,
  array_agg(name  order by key)     as names
from public.producthub_workstreams;
