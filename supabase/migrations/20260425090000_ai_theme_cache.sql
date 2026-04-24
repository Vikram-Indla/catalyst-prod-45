-- ═══════════════════════════════════════════════════════════════════════════
-- AI Theme Analyzer cache (2026-04-25)
-- ═══════════════════════════════════════════════════════════════════════════
-- Supports the For You → AI Theme tab (replaces the old AI Recap surface).
-- The Theme Analyzer is an Edge Function call ($$ + ~4s latency) and the same
-- themes are displayed to the same user on every page load until their input
-- set changes. So we cache.
--
-- Cache key
-- ─────────
--   (user_id, scope_mode, project_key)
-- where:
--   scope_mode = 'project' → themes scoped to one project (project_key is set)
--   scope_mode = 'personal' → themes scoped to the user's assigned items
--                            across all projects (project_key IS NULL)
--
-- Invalidation
-- ────────────
-- Two layers:
--  1. TTL: `expires_at` is 10 minutes after `generated_at`. Above that, the
--     hook MUST re-request regardless of signature — the Rovo-agreed freshness
--     window for theme-level analysis.
--  2. Signature: `issues_signature` is a deterministic hash of the input
--     issue set's (issue_key, updated_at) tuples. If a new issue arrives or
--     any input issue's updated_at changes, the hook's computed signature
--     diverges from cache's and a re-run fires. This catches sub-TTL drift.
--
-- Payload shape (ThemeAnalyzerResponse JSON):
--   { themes: [{ id, name, summary, count, percentage, intent, issueKeys[] }],
--     generatedAt, totalIssuesAnalyzed, scope: { mode, projectKey? } }

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

-- One cache row per (user, scope). On conflict we UPDATE (upsert from the
-- Edge Function). `project_key` is deliberately included — a user can cache
-- themes for BAU and INC independently, and for 'personal' mode with
-- project_key NULL.
CREATE UNIQUE INDEX IF NOT EXISTS ai_theme_cache_user_scope_key
  ON public.ai_theme_cache (user_id, scope_mode, COALESCE(project_key, ''));

-- Hot path: client reads "is there a live cache row for me?" —
-- query is user_id + scope_mode + project_key + expires_at > now().
CREATE INDEX IF NOT EXISTS ai_theme_cache_expires_at_idx
  ON public.ai_theme_cache (expires_at);

-- RLS: users only see/modify their own cache rows. The Edge Function writes
-- via the service role and bypasses RLS, but clients read the cache on the
-- happy path so we need SELECT for them.
ALTER TABLE public.ai_theme_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_theme_cache: users select own"
  ON public.ai_theme_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_theme_cache: users insert own"
  ON public.ai_theme_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_theme_cache: users update own"
  ON public.ai_theme_cache
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_theme_cache: users delete own"
  ON public.ai_theme_cache
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_theme_cache IS
  'Cache for AI Theme Analyzer output (For You → AI Theme tab). 10-min TTL, invalidated when input issue set changes (issues_signature mismatch).';

COMMENT ON COLUMN public.ai_theme_cache.issues_signature IS
  'Deterministic hash of (issue_key, updated_at) tuples for all input issues. When the user opens the tab, the hook recomputes the signature and forces re-analysis if it differs from the cached one.';
