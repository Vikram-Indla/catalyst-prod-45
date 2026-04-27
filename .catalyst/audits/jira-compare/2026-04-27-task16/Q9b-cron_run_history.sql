-- Q9b. pg_cron run history (last 50)
-- Was any sync-related job actually firing, and when did it stop?
SELECT
  j.jobname,
  jrd.runid,
  jrd.status,
  jrd.start_time,
  jrd.end_time,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_s,
  LEFT(jrd.return_message, 300) AS return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
ORDER BY jrd.start_time DESC NULLS LAST
LIMIT 50;
