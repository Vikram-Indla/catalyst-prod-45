-- Migration: fix_jira_cron_auth_use_anon_key
-- Date: 2026-05-24
--
-- ROOT CAUSE (diagnosed 2026-05-24):
--   The previous cron command used:
--     current_setting('app.settings.lifecycle_cron_secret')
--   This setting is NEVER configured in this project (pg_db_role_setting only has
--   jwt_exp). Every cron fire throws "unrecognized configuration parameter" and
--   the net.http_post call is never made — the incremental sync was silently dead.
--
-- FIX:
--   Replace the cron command with a hardcoded anon key. Since wh-jira-sync has
--   verify_jwt=false, the anon key is sufficient to reach the function.
--   The function internally uses SUPABASE_SERVICE_ROLE_KEY (Deno env) for all DB ops.
--
-- NOTE ON TOKEN EXPIRY (2026-05-24):
--   A separate issue was diagnosed: the Jira API token in ph_jira_connection is
--   expired/revoked (GET /rest/api/3/myself returns 401). The function now has a
--   pre-sync auth check that throws an error with a clear message when this happens,
--   instead of silently falling through to the prune step with 0 fetched issues.
--   Action required: Vikram must regenerate the Jira API token at
--   https://id.atlassian.com/manage-profile/security/api-tokens and update it via
--   admin → Jira Connection in Catalyst.

DO $$
BEGIN
  PERFORM cron.unschedule('jira-incremental-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'jira-incremental-sync',
  '*/15 * * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/wh-jira-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcXd0bGRwZmFjcnJsdmRubWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTkwODEsImV4cCI6MjA5NDQzNTA4MX0.CITWnsiEJEd1B-G4RReYZdaTFbBNvw8NnM8OrRvDX8s',
      'Content-Type', 'application/json'
    ),
    body    := '{"sync_type":"incremental"}'::jsonb
  );
  $cmd$
);
