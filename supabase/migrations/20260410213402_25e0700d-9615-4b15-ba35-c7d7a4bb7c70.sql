
-- Enable force cleanup to bypass the delete guardrail
SET LOCAL app.force_jira_cleanup = 'true';

-- Step 1: Clean FK-dependent tables
DELETE FROM jira_write_back_queue 
WHERE ph_issue_id IN (
  SELECT id FROM ph_issues WHERE jira_created_at < '2026-01-01'
);

DELETE FROM jira_sync_conflicts 
WHERE ph_issue_id IN (
  SELECT id FROM ph_issues WHERE jira_created_at < '2026-01-01'
);

-- Step 2: Purge pre-2026 ph_issues
DELETE FROM ph_issues 
WHERE jira_created_at < '2026-01-01';

-- Step 3: Purge pre-2026 tm_defects
DELETE FROM tm_defects 
WHERE jira_created_at < '2026-01-01' 
   OR (jira_created_at IS NULL AND created_at < '2026-01-01');

-- Reset
SET LOCAL app.force_jira_cleanup = 'false';
