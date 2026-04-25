-- Add Jira-parity fields to catalyst_issues for full Story Detail modal support
ALTER TABLE public.catalyst_issues
  ADD COLUMN IF NOT EXISTS fix_versions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB,
  ADD COLUMN IF NOT EXISTS parent_key TEXT,
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status_category TEXT;

-- Backfill status_category from status for any existing rows
UPDATE public.catalyst_issues
SET status_category = CASE
  WHEN lower(status) IN ('done', 'closed', 'completed', 'resolved') THEN 'done'
  WHEN lower(status) IN ('in progress', 'in review', 'in requirements', 'active', 'doing') THEN 'in_progress'
  ELSE 'todo'
END
WHERE status_category IS NULL;