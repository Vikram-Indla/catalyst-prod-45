-- Q2. ph_sync_log: last successful run per sync_type since 2026-03-01
-- Looking for: confirms claim that last 'success' was 2026-04-01.
SELECT
  sync_type,
  MAX(started_at) FILTER (WHERE status IN ('success','warning','completed')) AS last_success_at,
  MAX(started_at) FILTER (WHERE status = 'error')                            AS last_error_at,
  MAX(started_at) FILTER (WHERE status = 'running')                          AS last_stuck_running_at,
  MAX(started_at) FILTER (WHERE status = 'timeout')                          AS last_timeout_at,
  COUNT(*)        FILTER (WHERE status IN ('success','warning','completed') AND started_at >= '2026-03-01') AS successes_since_mar1,
  COUNT(*)        FILTER (WHERE status = 'error'   AND started_at >= '2026-03-01') AS errors_since_mar1,
  COUNT(*)        FILTER (WHERE status = 'running' AND started_at < now() - INTERVAL '15 minutes') AS stuck_running_zombies
FROM public.ph_sync_log
GROUP BY sync_type
ORDER BY last_success_at DESC NULLS LAST;
