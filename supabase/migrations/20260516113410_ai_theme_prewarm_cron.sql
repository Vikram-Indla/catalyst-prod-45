-- Migration: register pg_cron job for AI Theme daily pre-warm
-- Schedule: 18:00 UTC = 21:00 AST (Asia/Riyadh) every day.
--
-- The job hits the ai-theme-prewarm edge function which iterates all active
-- ai_theme_cache entries and refreshes them via forceRefresh=true so the
-- first morning page load always returns cached data (not a live LLM call).
--
-- Requirements:
--   • pg_cron extension (enabled via bootstrap migration)
--   • pg_net extension (enabled via bootstrap migration)
--   • app.supabase_url GUC set to project URL
--   • app.service_role_key GUC set to service_role_key (set via Supabase
--     dashboard → Settings → Vault → Secrets, NOT stored in plain SQL)
--
-- To verify the job was registered:
--   SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'ai-theme-prewarm-daily';
--
-- To disable temporarily:
--   SELECT cron.unschedule('ai-theme-prewarm-daily');

-- Remove any existing registration first (idempotent)
SELECT cron.unschedule('ai-theme-prewarm-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ai-theme-prewarm-daily'
);

-- Register the nightly pre-warm job
SELECT cron.schedule(
  'ai-theme-prewarm-daily',
  '0 18 * * *',  -- 18:00 UTC = 21:00 AST daily
  $$
  SELECT net.http_post(
    url  := current_setting('app.supabase_url') || '/functions/v1/ai-theme-prewarm',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
