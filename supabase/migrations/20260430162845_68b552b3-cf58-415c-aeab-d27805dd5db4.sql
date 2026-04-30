-- ═══════════════════════════════════════════════════════════════════════════
-- AI Theme Analyzer cache (re-applied 2026-04-30)
-- Original migration file: 20260425090000_ai_theme_cache.sql — never landed
-- in the live schema, causing every AI Focus tab visit to bypass cache and
-- pay full LLM latency.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_theme_cache (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_mode        text         NOT NULL CHECK (scope_mode IN ('project', 'personal')),
  project_key       text,
  payload           jsonb        NOT NULL,
  issues_signature  text         NOT NULL,
  generated_at      timestamptz  NOT NULL DEFAULT now(),
  expires_at        timestamptz  NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_theme_cache_user_scope_key
  ON public.ai_theme_cache (user_id, scope_mode, COALESCE(project_key, ''));

CREATE INDEX IF NOT EXISTS ai_theme_cache_expires_at_idx
  ON public.ai_theme_cache (expires_at);

ALTER TABLE public.ai_theme_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_theme_cache: users select own" ON public.ai_theme_cache;
CREATE POLICY "ai_theme_cache: users select own"
  ON public.ai_theme_cache FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_theme_cache: users insert own" ON public.ai_theme_cache;
CREATE POLICY "ai_theme_cache: users insert own"
  ON public.ai_theme_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_theme_cache: users update own" ON public.ai_theme_cache;
CREATE POLICY "ai_theme_cache: users update own"
  ON public.ai_theme_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_theme_cache: users delete own" ON public.ai_theme_cache;
CREATE POLICY "ai_theme_cache: users delete own"
  ON public.ai_theme_cache FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_theme_cache IS
  'Cache for AI Theme Analyzer (For You → AI Focus tab). 10-min TTL, signature-invalidated on (issue_key, jira_updated_at) drift.';