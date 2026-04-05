-- Fix: Remove 2026-only date filter from get_project_issue_counts()
-- Projects with pre-2026 issues (DATA, IN, SS) were returning 0 counts,
-- causing them to show "Not synced" in the UI despite having synced issues.

CREATE OR REPLACE FUNCTION get_project_issue_counts()
RETURNS TABLE(proj text, cnt bigint)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT project_key, count(*)
  FROM ph_issues
  GROUP BY project_key
  ORDER BY count(*) DESC;
$$;

-- Update total_issue_count to reflect ALL synced issues (not just 2026)
UPDATE ph_jira_connection SET total_issue_count = (
  SELECT count(*) FROM ph_issues
);

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
