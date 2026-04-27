-- ════════════════════════════════════════════════════════════════════════
-- TASK #16 — Jira → ph_issues sync diagnostic (READ-ONLY)
-- Date: 2026-04-27
-- Goal: Find why 2026-04-01 was the last successful BAU ingest.
-- Channel: Supabase Studio → SQL Editor on Lovable PROD project.
-- Safety: every query below is SELECT or pg_catalog read. NO DML.
-- Run all eight in one go; copy each result set back to Claude.
-- ════════════════════════════════════════════════════════════════════════

-- ── Q1. ph_sync_log timeline — last 30 runs, grouped by sync_type+status
--    Looking for: when did 'success' rows stop?  what 'error' came after?
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

-- ── Q2. ph_sync_log: last successful run per sync_type since 2026-03-01
--    Looking for: confirms claim that last 'success' was 2026-04-01.
SELECT
  sync_type,
  MAX(started_at)   FILTER (WHERE status IN ('success','warning','completed')) AS last_success_at,
  MAX(started_at)   FILTER (WHERE status = 'error')                            AS last_error_at,
  MAX(started_at)   FILTER (WHERE status = 'running')                          AS last_stuck_running_at,
  MAX(started_at)   FILTER (WHERE status = 'timeout')                          AS last_timeout_at,
  COUNT(*)          FILTER (WHERE status IN ('success','warning','completed') AND started_at >= '2026-03-01') AS successes_since_mar1,
  COUNT(*)          FILTER (WHERE status = 'error'   AND started_at >= '2026-03-01') AS errors_since_mar1,
  COUNT(*)          FILTER (WHERE status = 'running' AND started_at < now() - INTERVAL '15 minutes') AS stuck_running_zombies
FROM public.ph_sync_log
GROUP BY sync_type
ORDER BY last_success_at DESC NULLS LAST;

-- ── Q3. ph_issues current state — anchor BAU specifically
--    Looking for: confirm BAU max issue_key, latest jira_updated_at.
WITH parts AS (
  SELECT
    issue_key,
    project_key,
    jira_created_at,
    jira_updated_at,
    last_synced_at,
    -- Numeric tail of issue key, e.g. BAU-5239 → 5239
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

-- ── Q4. Top-line pulse across ALL projects
--    Looking for: is BAU the only project that's stale, or is everything dead?
SELECT
  project_key,
  COUNT(*)                                  AS row_count,
  MAX(last_synced_at)                       AS last_synced_at,
  MAX(jira_updated_at)                      AS max_jira_updated_at,
  MAX(jira_updated_at) FILTER (WHERE last_synced_at >= now() - INTERVAL '7 days') AS recently_synced_max_updated
FROM public.ph_issues
GROUP BY project_key
ORDER BY last_synced_at DESC NULLS LAST
LIMIT 20;

-- ── Q5. ph_jira_connection — auth + connected state
--    Looking for: status='connected', non-stale total_issue_count, sane site_url,
--    last_tested_at recent, last_test_result with no errors.
SELECT
  id,
  status,
  site_url,
  auth_email,
  auth_method,
  CASE WHEN auth_token_encrypted IS NULL OR auth_token_encrypted = '' THEN 'EMPTY'
       ELSE 'present (len=' || length(auth_token_encrypted) || ')' END AS token_state,
  CASE WHEN oauth_refresh_token_encrypted IS NULL OR oauth_refresh_token_encrypted = '' THEN 'EMPTY'
       ELSE 'present (len=' || length(oauth_refresh_token_encrypted) || ')' END AS refresh_token_state,
  jira_server_version,
  permissions_level,
  project_count,
  total_issue_count,
  total_version_count,
  created_at,
  updated_at,
  last_tested_at,
  last_test_result,
  -- Truncated preview of accessible_projects so we can spot BAU in the auth scope
  LEFT(accessible_projects::text, 2000) AS accessible_projects_preview
FROM public.ph_jira_connection
LIMIT 5;

-- ── Q6. wh_config — does BAU even appear in the sync allowlist?
--    Looking for: included_projects / sync_projects / sync_project_config['BAU']
SELECT
  key,
  CASE
    WHEN jsonb_typeof(value::jsonb) IN ('object','array')
      THEN LEFT(value::text, 1500)
    ELSE value::text
  END AS value_preview,
  updated_at
FROM public.wh_config
WHERE key IN (
  'sync_projects',
  'included_projects',
  'sync_issue_types',
  'sync_fix_versions',
  'sync_project_config',
  'hierarchy_levels',
  'status_mapping'
)
ORDER BY key;

-- ── Q7. pg_trigger on ph_issues — every BEFORE/AFTER trigger that could
--       silently drop rows. Per L27, never DROP TRIGGER without checking here.
SELECT
  t.tgname             AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'DISABLED'    -- ⚠️
    WHEN 'R' THEN 'replica-only'
    WHEN 'A' THEN 'always'
  END                  AS state,
  CASE WHEN t.tgtype & 2  = 2  THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE WHEN t.tgtype & 1  = 1  THEN 'ROW'    ELSE 'STATEMENT' END AS scope,
  CASE WHEN t.tgtype & 4  = 4  THEN 'INSERT' ELSE '' END
   || CASE WHEN t.tgtype & 16 = 16 THEN ' UPDATE' ELSE '' END
   || CASE WHEN t.tgtype & 8  = 8  THEN ' DELETE' ELSE '' END  AS events,
  p.proname            AS function_name,
  pg_get_functiondef(p.oid)::text AS function_def
FROM pg_trigger t
JOIN pg_class    c ON c.oid = t.tgrelid
JOIN pg_proc     p ON p.oid = t.tgfoid
WHERE c.relname = 'ph_issues'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- ── Q8. RLS policies on ph_issues — does service_role have an INSERT path?
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual, 300)       AS using_clause,
  LEFT(with_check, 300) AS with_check_clause
FROM pg_policies
WHERE tablename = 'ph_issues'
ORDER BY cmd, policyname;

-- ── Q9. pg_cron — IS THE POLLING SYNC EVEN SCHEDULED?
--    This is the highest-leverage query. If 'wh-jira-sync' or 'jira-bulk-sync'
--    isn't here, the sync stopped because nothing has been calling it.
--    (Schema is `cron` in the `extensions` namespace on Supabase.)
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobid;

-- ── Q9b. pg_cron run history (last 50) — was the job actually firing?
--    Look at success/failure for any job whose command references jira-sync.
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
