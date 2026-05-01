-- ────────────────────────────────────────────────────────────────────────
-- Block E follow-up (2026-05-01) — restore permissive read on ph_boards.
--
-- Problem: SQL editor (postgres role) sees 2 rows in ph_boards
-- (Dev Board + Lifecycle Board). supabase-js as authenticated role
-- sees 0 rows. Original migration had USING (true) for SELECT, so a
-- later migration must have tightened it.
--
-- This script:
--   1. Diagnoses current policies on ph_boards.
--   2. Restores a permissive read policy so PHBoardView can see the
--      seeded Lifecycle Board.
--   3. Drops the duplicate is_default flag from the legacy "Dev Board"
--      so PHBoardView picks Lifecycle Board as the sole default.
--   4. Verifies via a SET ROLE authenticated test.
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Diagnostic — show current policies on ph_boards
select
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_clause
from pg_policies
where schemaname = 'public'
  and tablename = 'ph_boards'
order by policyname;

-- 2. Drop any existing SELECT policies on ph_boards and replace with
-- the canonical permissive read used by Block E demo.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ph_boards'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.ph_boards', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can read ph_boards"
  on public.ph_boards
  for select
  to authenticated
  using (true);

-- 3. Make Lifecycle Board the sole default — flip the legacy Dev Board
-- to non-default so PHBoardView's `boards.find(b => b.is_default)`
-- picks the 13-column lifecycle.
update public.ph_boards
set is_default = false
where name = 'Dev Board';

-- 4. Verify — switch to authenticated role briefly and re-select.
set local role authenticated;
select id, name, is_default, jsonb_array_length(columns) as col_count
from public.ph_boards
order by is_default desc, name;
reset role;
