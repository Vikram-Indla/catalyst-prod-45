-- RPC function to get per-project 2026 issue counts
-- SECURITY DEFINER bypasses PostgREST schema cache issues
CREATE OR REPLACE FUNCTION get_project_issue_counts()
RETURNS TABLE(proj text, cnt bigint) 
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT project_key, count(*) 
  FROM ph_issues 
  WHERE jira_created_at >= '2026-01-01' 
  GROUP BY project_key 
  ORDER BY count(*) DESC;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_project_issue_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_issue_counts() TO anon;

-- Update total_issue_count to reflect 2026 data
UPDATE ph_jira_connection SET total_issue_count = (
  SELECT count(*) FROM ph_issues WHERE jira_created_at >= '2026-01-01'
);

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
