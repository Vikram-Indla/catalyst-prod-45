-- ────────────────────────────────────────────────────────────────────────
-- Diagnostic v2 (2026-05-01) — same diff, with the bad authenticator-role
-- block removed (Supabase always SETs ROLE to anon/authenticated, never
-- runs as authenticator directly, so that test errored even on the
-- working table).
--
-- Run all blocks. Compare producthub vs planner row by row.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Privileges by role. THIS IS THE KEY ONE.
-- If anon/authenticated have SELECT on planner but not producthub,
-- that's why PostgREST skips producthub.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('producthub_workstreams', 'planner_workstreams')
  and grantee in ('anon', 'authenticated', 'service_role', 'postgres')
group by table_name, grantee
order by table_name, grantee;

-- 2. RLS policies
select
  tablename,
  policyname,
  cmd,
  roles,
  qual::text       as using_clause,
  with_check::text as with_check_clause
from pg_policies
where schemaname = 'public'
  and tablename in ('producthub_workstreams', 'planner_workstreams')
order by tablename, policyname;

-- 3. Constraints — focus on FKs because the mim_business_requests FK
-- could be malformed in a way that breaks PostgREST introspection.
select
  conrelid::regclass        as on_table,
  conname                   as constraint_name,
  contype                   as type,    -- 'f' = FK, 'p' = PK, etc.
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid::regclass::text in (
        'producthub_workstreams',
        'planner_workstreams',
        'mim_business_requests'
      )
   or confrelid::regclass::text in (
        'producthub_workstreams',
        'planner_workstreams'
      )
order by on_table, conname;

-- 4. Base table attributes side-by-side.
select
  c.relname                       as table_name,
  c.relrowsecurity                as rls_enabled,
  c.relforcerowsecurity           as rls_forced,
  c.relhasindex                   as has_index,
  c.relhastriggers                as has_triggers,
  c.relreplident                  as replica_identity,
  pg_size_pretty(pg_total_relation_size(c.oid)) as size
from pg_class c
where c.relname in ('producthub_workstreams', 'planner_workstreams')
order by c.relname;
