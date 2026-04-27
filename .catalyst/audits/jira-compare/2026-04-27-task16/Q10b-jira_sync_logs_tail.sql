-- Q10b. Whatever the columns are, just SELECT * for the most-recent 30 rows.
-- This always works because we don't name columns. Run after Q10a.
-- We're looking for: when did the LAST row land? What's its status?
SELECT *
FROM public.jira_sync_logs
ORDER BY created_at DESC NULLS LAST
LIMIT 30;
