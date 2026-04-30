-- ═══════════════════════════════════════════════════════════════════════════
-- AI Themes — daily 21:00 AST pre-warm (2026-04-30)
-- ═══════════════════════════════════════════════════════════════════════════
-- Manual-deploy script (per Catalyst "No Prod Writes" core rule).
-- Run in the Supabase SQL editor against the target environment.
--
-- WHAT IT DOES
-- ────────────
-- At 21:00 Asia/Riyadh (= 18:00 UTC) every day, calls the `ai-digest` Edge
-- Function with `mode: 'themes'` + `forceRefresh: true` for every user-scope
-- combo that has a recent ai_theme_cache row. This pre-warms the cache so
-- the first For You page load after 9 PM is served warm — no LLM call on
-- visit, no per-load token cost.
--
-- The Edge Function's TTL was extended to "next 21:00 AST" in the same change
-- (supabase/functions/ai-digest/themes.ts), and the client hook
-- src/hooks/useAiThemes.ts mirrors that staleTime so React Query never
-- re-invokes within the day.
--
-- BEFORE RUNNING
-- ──────────────
-- Replace <SUPABASE_URL> and <SERVICE_ROLE_KEY> below.
-- pg_cron + pg_net must be enabled (already true for this project).
--
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop any prior version of this job (idempotent re-run).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ai-themes-daily-prewarm-21-ast';

-- 2. Schedule the daily pre-warm at 18:00 UTC (= 21:00 AST, UTC+3).
--    Cron expression: minute hour day-of-month month day-of-week
SELECT cron.schedule(
  'ai-themes-daily-prewarm-21-ast',
  '0 18 * * *',
  $job$
  -- For every distinct (user, scope, project) that's been used in the last
  -- 7 days, fire a forceRefresh call to ai-digest. The Edge Function owns
  -- auth/RLS via the service role we pass in the Authorization header — we
  -- impersonate each user via the body's userId is derived from the JWT,
  -- so we use the service role and let the function read user_id from the
  -- cache row context. (See ai-digest/themes.ts line ~240 for the auth flow.)
  --
  -- NOTE: ai-digest requires an authenticated user, so this loop calls it
  -- once per cached user-scope. Adjust the URL/key constants once on first
  -- deploy.
  WITH targets AS (
    SELECT DISTINCT user_id, scope_mode, project_key
    FROM public.ai_theme_cache
    WHERE generated_at > now() - interval '7 days'
  )
  SELECT net.http_post(
    url     := 'https://mqgshobotcvcjouzxdbi.supabase.co/functions/v1/ai-digest',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      -- Service-role key required so the function can read/write the cache
      -- table on behalf of `user_id` without a real user JWT.
      'Authorization',  'Bearer <SERVICE_ROLE_KEY>',
      'x-prewarm-user', t.user_id::text
    ),
    body    := jsonb_build_object(
      'mode',         'themes',
      'scope',        t.scope_mode,
      'projectKey',   t.project_key,
      'forceRefresh', true,
      'prewarmUserId', t.user_id
    )
  )
  FROM targets t;
  $job$
);

-- 3. Verify the schedule.
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'ai-themes-daily-prewarm-21-ast';

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT cron.unschedule('ai-themes-daily-prewarm-21-ast');
