-- Q3. ph_issues current state — anchor BAU specifically
-- Looking for: confirm BAU max issue_key, latest jira_updated_at.
WITH parts AS (
  SELECT
    issue_key,
    project_key,
    jira_created_at,
    jira_updated_at,
    last_synced_at,
    NULLIF(regexp_replace(issue_key, '^[A-Z]+-', ''), '')::int AS key_num
  FROM public.ph_issues
  WHERE project_key = 'BAU'
)
SELECT
  COUNT(*)                            AS bau_row_count,
  MAX(key_num)                        AS bau_max_numeric_key,
  MIN(key_num)                        AS bau_min_numeric_key,
  MAX(jira_created_at)                AS bau_max_jira_created_at,
  MAX(jira_updated_at)                AS bau_max_jira_updated_at,
  MAX(last_synced_at)                 AS bau_max_last_synced_at,
  COUNT(*) FILTER (WHERE jira_updated_at >= '2026-04-01') AS bau_updated_since_apr1
FROM parts;
