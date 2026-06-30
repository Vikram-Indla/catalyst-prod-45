-- Migration: Status Category Hard Rule
-- Confirmed 2026-07-01: every work-item status must sit in exactly one of
-- (todo | in_progress | done). No NULL, no free-form strings.
--
-- Phase 1: backfill NULLs using the canonical name→category mapping.
-- Phase 2: add NOT NULL + CHECK constraint.
--
-- NOTE: Backfill maps by status string lowercase match. Any status not in
-- the mapping falls to 'todo' (safe fallback — never lie with in_progress).

-- Phase 1: backfill
UPDATE ph_issues
SET status_category = CASE
  -- done
  WHEN lower(status) IN (
    'production ready', 'beta ready', 'in production', 'done', 'closed',
    'released', 'completed', 'approved', 'resolved',
    'cancelled', 'canceled', 'won''t do', 'wont do', 'rejected'
  ) THEN 'done'
  -- in_progress
  WHEN lower(status) IN (
    'in development', 'in progress', 'in review', 'in qa', 'in entity integration',
    'in uat', 'in beta', 'end to end testing', 'on hold', 'analysis', 'blocked',
    'awaiting info', 'ready for development', 'ready for qa', 'ready for review',
    'implementation', 'in implementation', 'paused'
  ) THEN 'in_progress'
  -- todo (explicit + default fallback)
  ELSE 'todo'
END
WHERE status_category IS NULL
   OR status_category NOT IN ('todo', 'in_progress', 'done');

-- Phase 2: add NOT NULL constraint (backfill above ensures no NULLs remain)
ALTER TABLE ph_issues
  ALTER COLUMN status_category SET NOT NULL,
  ALTER COLUMN status_category SET DEFAULT 'todo';

-- Phase 2b: add CHECK constraint to reject invalid values at insert/update time
ALTER TABLE ph_issues
  DROP CONSTRAINT IF EXISTS ph_issues_status_category_check;

ALTER TABLE ph_issues
  ADD CONSTRAINT ph_issues_status_category_check
  CHECK (status_category IN ('todo', 'in_progress', 'done'));
