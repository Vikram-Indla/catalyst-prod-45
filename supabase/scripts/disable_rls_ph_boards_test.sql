-- ────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC ONLY (2026-05-01) — temporarily disable RLS on ph_boards.
--
-- Goal: confirm whether the 0-rows-returned-to-authenticated issue is RLS
-- or something else entirely. Policies look perfect (USING(true) for SELECT)
-- but the supabase-js client gets [] while postgres-role SELECT sees 5 rows.
--
-- This script:
--   1. Disables RLS on ph_boards (READ ANYONE).
--   2. The user re-loads /project-hub/BAU/board.
--   3. If 13 columns appear → RLS was the issue, we'll restore RLS with a
--      working policy in a follow-up.
--   4. If still empty → RLS isn't the cause; we look elsewhere.
--
-- TEMP — re-enable RLS once we've isolated the cause:
--   ALTER TABLE public.ph_boards ENABLE ROW LEVEL SECURITY;
--
-- This is safe in a dev DB. Do not run on production.
-- ────────────────────────────────────────────────────────────────────────

alter table public.ph_boards disable row level security;

-- Verification — same query the supabase client runs.
select id, name, is_default, jsonb_array_length(columns) as col_count
from public.ph_boards
order by is_default desc, name;
