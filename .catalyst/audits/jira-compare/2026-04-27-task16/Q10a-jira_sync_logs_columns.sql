-- Q10a. Introspect: what columns does jira_sync_logs ACTUALLY have on PROD?
-- types.ts is out of date. Run this first to get the real shape.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'jira_sync_logs'
ORDER BY ordinal_position;
