-- Q1. ph_sync_log timeline — last 30 runs
-- Looking for: when did 'success' rows stop?  what 'error' came after?
SELECT
  id,
  sync_type,
  status,
  started_at,
  completed_at,
  duration_ms,
  issues_fetched,
  issues_upserted,
  issues_pruned,
  versions_fetched,
  array_length(projects_synced, 1)  AS n_projects,
  projects_synced[1:5]              AS projects_sample,
  LEFT(error_message, 300)          AS error_snippet,
  array_length(warnings, 1)         AS n_warnings,
  warnings[1:3]                     AS warnings_sample
FROM public.ph_sync_log
ORDER BY started_at DESC NULLS LAST
LIMIT 30;
