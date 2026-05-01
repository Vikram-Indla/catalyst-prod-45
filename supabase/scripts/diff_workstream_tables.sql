-- ────────────────────────────────────────────────────────────────────────
-- Diagnostic (2026-05-01) — diff producthub_workstreams vs planner_workstreams.
--
-- Both tables exist in public. planner is exposed via PostgREST; producthub
-- is not. Same project, same role, same dev client. So PostgREST is
-- specifically excluding producthub_workstreams from its schema cache.
-- This script asks: what's different about it?
--
-- Run all blocks. Look for any column where the two tables produce
-- different values — that's the smoking gun.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Existence + base attributes
select
  c.relname                       as table_name,
  c.relkind                       as kind,           -- 'r' = ordinary table
  c.relnamespace::regnamespace    as schema,
  c.relrowsecurity                as rls_enabled,
  c.relforcerowsecurity           as rls_forced,
  c.relhasindex                   as has_index,
  c.relhastriggers                as has_triggers,
  pg_size_pretty(pg_total_relation_size(c.oid)) as size
from pg_class c
where c.relname in ('producthub_workstreams', 'planner_workstreams')
order by c.relname;

-- 2. Privileges by role
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('producthub_workstreams', 'planner_workstreams')
  and grantee in ('anon', 'authenticated', 'service_role', 'postgres', 'authenticator')
group by table_name, grantee
order by table_name, grantee;

-- 3. RLS policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('producthub_workstreams', 'planner_workstreams')
order by tablename, policyname;

-- 4. Columns
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('producthub_workstreams', 'planner_workstreams')
order by table_name, ordinal_position;

-- 5. Constraints (FKs especially — could trip introspection)
select
  conrelid::regclass        as on_table,
  conname                   as constraint_name,
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

-- 6. Publication membership (for realtime / replication)
select
  p.pubname,
  pn.schemaname,
  pn.tablename
from pg_publication p
join pg_publication_tables pn on pn.pubname = p.pubname
where pn.tablename in ('producthub_workstreams', 'planner_workstreams')
order by pn.tablename, p.pubname;

-- 7. Last-resort sanity check: PostgREST's introspection runs as the
-- 'authenticator' role. Confirm authenticator can see both tables.
set role authenticator;
select 'planner_workstreams'    as t, count(*) from public.planner_workstreams
union all
select 'producthub_workstreams' as t, count(*) from public.producthub_workstreams;
reset role;
