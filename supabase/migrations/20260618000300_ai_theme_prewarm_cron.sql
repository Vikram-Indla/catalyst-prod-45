-- Schedule the daily AI-theme pre-warm at 06:00 Asia/Riyadh (03:00 UTC).
-- Replaces the never-actually-scheduled 21:00 job. Uses the working
-- hardcoded-URL pattern (jira-incremental-sync style) — the GUC pattern
-- (current_setting('app.settings.*')) is broken in this project (those GUCs
-- are unset, so routing-taxonomy-scan's cron silently never fires).
--
-- The Authorization bearer is read at cron runtime from
-- public.ai_theme_prewarm_config — keeping the secret out of git. The
-- prewarm function validates the same secret via its service-role client.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ai-theme-prewarm-daily') then
    perform cron.unschedule('ai-theme-prewarm-daily');
  end if;
end $$;

select cron.schedule(
  'ai-theme-prewarm-daily',
  '0 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/ai-theme-prewarm',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select secret from public.ai_theme_prewarm_config where id),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 280000
  );
  $cron$
);
