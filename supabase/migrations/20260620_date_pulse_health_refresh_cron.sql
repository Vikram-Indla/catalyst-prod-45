-- Nightly health refresh cron for Date Pulse
-- Calls the date-pulse-health-refresh edge function at 03:00 UTC daily
-- Mirrors the pattern from 20260619_rh_predictions_cron_refresh.sql

CREATE OR REPLACE FUNCTION public.refresh_date_pulse_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcXd0bGRwZmFjcnJsdmRubWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTkwODEsImV4cCI6MjA5NDQzNTA4MX0.CITWnsiEJEd1B-G4RReYZdaTFbBNvw8NnM8OrRvDX8s';
  fnurl text := 'https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/date-pulse-health-refresh';
  hdr jsonb := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon, 'apikey', anon);
BEGIN
  PERFORM net.http_post(fnurl, '{}'::jsonb, '{}'::jsonb, hdr);
END;
$fn$;

SELECT cron.unschedule('date-pulse-health-refresh')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'date-pulse-health-refresh');
SELECT cron.schedule('date-pulse-health-refresh', '0 3 * * *', $$SELECT public.refresh_date_pulse_health();$$);
