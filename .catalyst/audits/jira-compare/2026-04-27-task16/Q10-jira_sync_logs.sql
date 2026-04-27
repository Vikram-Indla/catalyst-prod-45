-- Q10. jira_sync_logs — when did the webhook last fire? (FIXED column names)
-- Real columns from types.ts: connection_id, sync_type, entity_type, status,
-- items_created, items_updated, items_failed, items_synced, items_processed,
-- conflicts_found, error_message, error_details, started_at, completed_at,
-- created_at, updated_at, project_id, triggered_by, created_by, updated_by.
SELECT
  id,
  sync_type,
  entity_type,
  status,
  items_processed,
  items_created,
  items_updated,
  items_failed,
  items_synced,
  conflicts_found,
  LEFT(error_message, 300) AS error_snippet,
  triggered_by,
  started_at,
  completed_at,
  created_at
FROM public.jira_sync_logs
ORDER BY created_at DESC NULLS LAST
LIMIT 30;
