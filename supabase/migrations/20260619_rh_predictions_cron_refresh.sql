-- Nightly refresh of release/sprint predictions so the calendar reflects
-- current dates/statuses without a manual re-run. Calls the edge function via
-- pg_net using the public anon key (verify_jwt accepts it; no secret needed).
CREATE OR REPLACE FUNCTION public.refresh_release_predictions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcXd0bGRwZmFjcnJsdmRubWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTkwODEsImV4cCI6MjA5NDQzNTA4MX0.CITWnsiEJEd1B-G4RReYZdaTFbBNvw8NnM8OrRvDX8s';
  fnurl text := 'https://lmqwtldpfacrrlvdnmld.supabase.co/functions/v1/release-sprint-predictor';
  hdr jsonb := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'apikey',anon);
BEGIN
  FOR r IN SELECT id FROM rh_releases LOOP
    PERFORM net.http_post(fnurl, jsonb_build_object('kind','release','id', r.id::text), '{}'::jsonb, hdr);
  END LOOP;
  FOR r IN SELECT DISTINCT sprint_name AS id FROM ph_issues WHERE sprint_name IS NOT NULL AND sprint_name <> '' LOOP
    PERFORM net.http_post(fnurl, jsonb_build_object('kind','sprint','id', r.id), '{}'::jsonb, hdr);
  END LOOP;
END;
$fn$;

SELECT cron.unschedule('refresh-release-predictions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-release-predictions');
SELECT cron.schedule('refresh-release-predictions', '0 2 * * *', $$SELECT public.refresh_release_predictions();$$);
