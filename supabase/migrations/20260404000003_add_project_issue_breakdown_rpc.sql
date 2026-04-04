-- RPC: Get issue breakdown by type and status for a specific project
-- Used by the IssueBreakdown popover in AllProjectsTable
CREATE OR REPLACE FUNCTION get_project_issue_breakdown(p_project_key text)
RETURNS TABLE(
  issue_type text,
  status_category text,
  cnt bigint
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    COALESCE(issue_type, 'Unknown') AS issue_type,
    COALESCE(status_category, 'To Do') AS status_category,
    count(*) AS cnt
  FROM ph_issues
  WHERE project_key = p_project_key
  GROUP BY issue_type, status_category
  ORDER BY count(*) DESC;
$$;

GRANT EXECUTE ON FUNCTION get_project_issue_breakdown(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_issue_breakdown(text) TO anon;

NOTIFY pgrst, 'reload schema';
