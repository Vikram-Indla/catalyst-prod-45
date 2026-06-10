-- Time-in-Status hover card · Phase 4 row 3
-- Locks down history tables for the TIS backfill + hover card pipeline.
--
-- 1. work_item_changelogs RLS — currently has "Allow all access to
--    changelogs" with USING(true) for role public (anon CAN write).
--    Replace with: SELECT to authenticated (non-PII analytic data per
--    CLAUDE.md 2026-05-29), writes restricted to service_role.
--
-- 2. catalyst_status_history idempotency — the wh-jira-changelog-backfill
--    edge fn calls .upsert(..., onConflict: 'issue_key,changed_at,to_status,from_status').
--    No matching unique index exists, so re-runs silently duplicate. Add a
--    partial unique index that treats NULL from_status as '' (matching the
--    edge fn's COALESCE convention).

BEGIN;

-- 1. work_item_changelogs RLS
DROP POLICY IF EXISTS "Allow all access to changelogs" ON public.work_item_changelogs;

-- Non-PII analytic data: any authenticated user can read.
-- Application boundary (AdminGuard / per-view auth) controls UI access.
CREATE POLICY "work_item_changelogs_select_authenticated"
  ON public.work_item_changelogs
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes are service-role only. Backfill function runs with service-role key.
-- No INSERT/UPDATE/DELETE policy for authenticated → blocked by RLS.

-- 2. catalyst_status_history idempotency
-- The (issue_key, changed_at, to_status, COALESCE(from_status, '')) tuple
-- uniquely identifies a Jira transition. Partial-index style lets us treat
-- NULL from_status as a real distinct value matching the edge fn's UPSERT.
CREATE UNIQUE INDEX IF NOT EXISTS catalyst_status_history_idempotent_key
  ON public.catalyst_status_history (
    issue_key,
    changed_at,
    to_status,
    COALESCE(from_status, '')
  );

COMMIT;
