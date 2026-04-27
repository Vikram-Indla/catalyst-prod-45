-- Q4. Top-line pulse across ALL projects
-- Looking for: is BAU the only stale project, or is everything dead?
SELECT
  project_key,
  COUNT(*)                                 AS row_count,
  MAX(last_synced_at)                      AS last_synced_at,
  MAX(jira_updated_at)                     AS max_jira_updated_at,
  MAX(jira_updated_at) FILTER (WHERE last_synced_at >= now() - INTERVAL '7 days') AS recently_synced_max_updated
FROM public.ph_issues
GROUP BY project_key
ORDER BY last_synced_at DESC NULLS LAST
LIMIT 20;
