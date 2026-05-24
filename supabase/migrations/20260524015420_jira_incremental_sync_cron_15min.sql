-- Migration: jira_incremental_sync_cron_15min
-- Date: 2026-05-24
--
-- ROOT CAUSE (diagnosed 2026-05-24):
--   The `jira-daily-sync` cron job never existed in cron.job (confirmed via
--   SELECT * FROM cron.job — zero Jira-related rows). It was either never
--   registered or was dropped during the 69-table cleanup. Last successful
--   sync was 2026-05-17 (7 days of zero sync).
--
-- CHANGES:
--   1. Register `jira-incremental-sync` at */15 * * * * (every 15 minutes).
--   2. Uses sync_type=incremental → wh-jira-sync adds `updated >= "-30m"` to
--      JQL (only fetches recently-changed issues, no per-project prune).
--   3. Full syncs (sync_type=full) still work on-demand for recovery / initial
--      backfill and DO prune — they are NOT called by this cron.
--
-- DATA RETENTION PRINCIPLE (per user requirement 2026-05-24):
--   Incremental syncs never delete ph_issues rows. Rows are only pruned during
--   explicit full syncs (manual or recovery). This ensures Catalyst data is
--   preserved even when Jira issues fall outside the JQL window.

-- Remove old daily sync if it somehow exists
DO $$
BEGIN
  PERFORM cron.unschedule('jira-daily-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Idempotent: remove the new job first so this migration can be re-applied
DO $$
BEGIN
  PERFORM cron.unschedule('jira-incremental-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create 15-minute incremental Jira sync cron.
-- Uses app.settings.* pattern confirmed working in routing-taxonomy-scan (jobid=6).
SELECT cron.schedule(
  'jira-incremental-sync',
  '*/15 * * * *',
  $cmd$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/wh-jira-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.lifecycle_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body    := '{"sync_type":"incremental"}'::jsonb
  );
  $cmd$
);
