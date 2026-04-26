-- =============================================================================
-- catalyst_status_history — promote actor info from metadata JSON to columns
-- =============================================================================
-- The wh-jira-changelog-backfill function has been writing the Jira changelog
-- author into `metadata.jira_actor` since day one, but it was buried in JSON
-- and unindexed. The Recent Activity widget needs first-class access so it
-- can render the real author of each transition (instead of falling back to
-- the issue's current assignee). This migration:
--   1. Adds actor_name + actor_account_id columns (nullable — the trigger
--      that fires on live ph_issues updates can't always tell us who).
--   2. Backfills both columns from the existing metadata payload so historic
--      rows inserted by previous backfill runs are not lost.
--   3. Adds a partial index on actor_name for the activity feed query.
-- Idempotent — uses ADD COLUMN IF NOT EXISTS so re-running is a no-op.
-- =============================================================================

ALTER TABLE public.catalyst_status_history
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS actor_account_id TEXT;

-- Backfill from the JSON metadata that the edge function has been writing.
UPDATE public.catalyst_status_history
SET actor_name = metadata->>'jira_actor'
WHERE actor_name IS NULL
  AND metadata ? 'jira_actor'
  AND (metadata->>'jira_actor') IS NOT NULL
  AND length(trim(metadata->>'jira_actor')) > 0;

UPDATE public.catalyst_status_history
SET actor_account_id = metadata->>'jira_actor_account_id'
WHERE actor_account_id IS NULL
  AND metadata ? 'jira_actor_account_id'
  AND (metadata->>'jira_actor_account_id') IS NOT NULL;

-- Index supports the Recent Activity feed's filter "rows with a known actor".
CREATE INDEX IF NOT EXISTS idx_catalyst_status_history_actor_name
  ON public.catalyst_status_history (actor_name)
  WHERE actor_name IS NOT NULL;

-- Force PostgREST to refresh its schema cache so the API exposes the new
-- columns immediately. Otherwise the next select() call would error with
-- PGRST204 until the cache rolls over.
NOTIFY pgrst, 'reload schema';
