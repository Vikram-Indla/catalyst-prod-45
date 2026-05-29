-- Migration: sync_data_cleanup_and_active_users
-- Date: 2026-05-25
--
-- Enforces four rules:
--   Rule 1: only 2026 data (pre-2026 rows physically deleted)
--   Rule 2: only active Jira users (add jira_active column; delete unmapped)
--   Rule 3: delete all out-of-scope data (soft-deleted rows, TEST project, non-sync projects)
--   Rule 4: MDT project belongs to Products module — must never be in ph_issues
--
-- This is a one-time cleanup. The sync function (v16) enforces rules 2+4 on every run.

-- Rule 2: add jira_active column to ph_user_mapping
ALTER TABLE ph_user_mapping
  ADD COLUMN IF NOT EXISTS jira_active BOOLEAN DEFAULT NULL;

-- Rule 3+2: delete unmapped users (is_mapped=false)
-- v16 sync will re-populate only those still active in Jira.
DELETE FROM ph_user_mapping WHERE is_mapped = false;

-- Rule 1+3+4: physically delete out-of-scope ph_issues rows
DO $$
BEGIN
  PERFORM set_config('app.force_jira_cleanup', 'true', true);
  DELETE FROM ph_issues WHERE project_key NOT IN ('BAU','MWR','ICP','IRP','IN','INV','IP','TAH');
  DELETE FROM ph_issues WHERE project_key = 'MDT';
  DELETE FROM ph_issues WHERE jira_created_at < '2026-01-01' AND jira_updated_at < '2026-01-01';
  DELETE FROM ph_issues WHERE jira_created_at IS NULL AND jira_updated_at IS NULL;
  DELETE FROM ph_issues WHERE deleted_at IS NOT NULL;
END;
$$;
