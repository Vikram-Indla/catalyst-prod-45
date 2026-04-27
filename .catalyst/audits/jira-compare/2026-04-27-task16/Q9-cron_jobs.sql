-- Q9. pg_cron — IS THE POLLING SYNC EVEN SCHEDULED?
-- If 'wh-jira-sync' or any 'jira' command isn't here, the sync is manual-only.
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  database,
  username,
  nodename,
  nodeport
FROM cron.job
ORDER BY jobid;
