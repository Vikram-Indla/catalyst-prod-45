-- Catalyst Replay Phase 1: work_item_transitions is the canonical Replay data
-- source, populated from the Jira changelog backfill keyed by Jira issue.
-- The original FK pointed at work_items(id) — an unrelated, empty AI
-- story-generation table — making it impossible to write Jira-derived
-- transitions keyed to ph_issues. Repoint the FK to ph_issues(id) (UNIQUE),
-- which is the documented intent. work_items has 0 rows so nothing is lost.
ALTER TABLE public.work_item_transitions
  DROP CONSTRAINT IF EXISTS work_item_transitions_work_item_id_fkey;

ALTER TABLE public.work_item_transitions
  ADD CONSTRAINT work_item_transitions_work_item_id_fkey
  FOREIGN KEY (work_item_id) REFERENCES public.ph_issues(id) ON DELETE CASCADE;

-- Idempotency key for the backfill upsert. The UNIQUE (work_item_id,
-- jira_changelog_id) constraint already exists
-- (work_item_transitions_work_item_id_jira_changelog_id_key); this is a
-- defensive no-op guard in case the table is recreated elsewhere.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.work_item_transitions'::regclass
      AND conname = 'work_item_transitions_work_item_id_jira_changelog_id_key'
  ) THEN
    ALTER TABLE public.work_item_transitions
      ADD CONSTRAINT work_item_transitions_work_item_id_jira_changelog_id_key
      UNIQUE (work_item_id, jira_changelog_id);
  END IF;
END $$;
