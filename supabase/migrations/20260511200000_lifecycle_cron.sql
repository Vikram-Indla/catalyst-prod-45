-- Phase 4 — Lifecycle automation (pg_cron)
--
-- Runs lifecycle-check daily at 09:00 UTC.
-- Requires: pg_cron extension + net (http) extension + LIFECYCLE_CRON_SECRET
--           edge-function secret set in Supabase dashboard.
--
-- LOVABLE PASTE BLOCK — run in SQL editor, not via supabase db push.
-- pg_cron and net are managed extensions; they are not part of the migrations
-- pipeline and cannot be applied via the CLI migration runner.

-- 1. Enable extensions (idempotent).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Remove any prior version of this job (safe re-run).
SELECT cron.unschedule('catalyst-lifecycle-check')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'catalyst-lifecycle-check'
);

-- 3. Schedule the job: daily at 09:00 UTC.
--    The Authorization header uses a secret stored in Supabase Vault /
--    Edge Function secrets as LIFECYCLE_CRON_SECRET.
--    Replace <PROJECT_REF> with your Supabase project reference slug.
SELECT cron.schedule(
  'catalyst-lifecycle-check',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/lifecycle-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <LIFECYCLE_CRON_SECRET>"}'::jsonb,
    body    := '{"dry_run": false}'::jsonb
  );
  $$
);
