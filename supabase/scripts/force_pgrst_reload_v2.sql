-- ────────────────────────────────────────────────────────────────────────
-- Block C follow-up v2 (2026-05-01) — heavier schema-cache reload
--
-- v1 (force_pgrst_reload_producthub_workstreams.sql) ran clean and the
-- verification SELECT returned ws_count=1 / keys=['INV']. But PostgREST
-- still returns PGRST205 from the browser. So either:
--   (a) Supabase's pgrst_watch event trigger isn't installed on this
--       Lovable project, OR
--   (b) it's installed but the COMMENT-ON-TABLE event didn't make it.
--
-- This script:
--   1. Diagnoses (a) directly — selects from pg_event_trigger.
--   2. Forces a real, irrevocable schema mutation that any ddl listener
--      cannot ignore: ADD COLUMN _pgrst_force_reload TEXT, DROP COLUMN.
--   3. Re-issues NOTIFY against several plausible channel names that
--      different PostgREST versions accept.
--   4. Returns the verification SELECT so you see the row again.
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Diagnose pgrst_watch presence. If this returns 0 rows, Lovable's
-- Supabase doesn't have the standard auto-reload trigger — that's why
-- v1 didn't work. The ALTER below still forces a reload via NOTIFY.
select
  evtname        as event_trigger_name,
  evtevent       as fires_on,
  evtenabled     as enabled
from pg_event_trigger
where evtname like '%pgrst%'
   or evtname like '%postgrest%'
   or evtname like '%schema_reload%';

-- 2. Force a real schema mutation. This creates a new column reference
-- in pg_attribute then removes it, which absolutely cannot be silently
-- coalesced away. Any DDL-listening process MUST notice.
alter table public.producthub_workstreams
  add column _pgrst_force_reload text default null;

alter table public.producthub_workstreams
  drop column _pgrst_force_reload;

-- 3. Multi-channel NOTIFY. Different PostgREST configurations listen on
-- different channels. 'pgrst' is the default, 'ddl_command_end' is the
-- event-trigger's typical channel name, and 'reload' is sometimes used
-- by Supabase's edge runtime.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
select pg_notify('pgrst', 'reload schema');
select pg_notify('supabase_realtime', 'reload schema');

-- 4. Verify the row is still there post-mutation.
select
  count(*)                          as ws_count,
  array_agg(key   order by key)     as keys,
  array_agg(name  order by key)     as names,
  array_agg(id    order by key)     as ids
from public.producthub_workstreams;

-- 5. Diagnostic — confirm the table is visible in information_schema
-- under the role PostgREST uses (authenticator).
select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in ('producthub_workstreams', 'planner_workstreams');
