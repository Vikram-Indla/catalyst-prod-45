-- ═══════════════════════════════════════════════════════════════════════════
-- Caty ageing-triage cache (2026-06-18)
-- ═══════════════════════════════════════════════════════════════════════════
-- Backs the "Review" button on For You → Ageing (CatyAgeingTriage). The button
-- sends the user's top-10 stalest items to ai-digest mode=ageing-triage, which
-- calls Gemini ($$ + latency). Before this table the branch had NO cache —
-- every click re-ran Gemini even when nothing changed.
--
-- Shares the architecture of ai_theme_cache (signature-invalidated, daily TTL)
-- via the shared primitive supabase/functions/_shared/ai-cache.ts.
--
-- Cache key
-- ─────────
--   (user_id) — ageing triage is always personal (the user's own assigned
--   stale items), so one cache row per user. No scope/project dimension.
--
-- Invalidation
-- ────────────
--  1. Signature: issues_signature = SHA-256 over the top-10 items'
--     (key, status, comment_count, assignee_inactive) tuples. days_open is
--     DELIBERATELY excluded — it ticks up every day, which would bust the cache
--     daily for no semantic reason. Membership changes (an item entering/leaving
--     the top-10) and state changes (status/comments/assignee activity) DO bust.
--  2. TTL: expires_at = next 06:00 Asia/Riyadh, matching the themes daily reset.
--
-- Payload shape: the raw ageing-triage response { triageResults: [...] }.

CREATE TABLE IF NOT EXISTS public.ai_ageing_triage_cache (
  user_id           uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload           jsonb        NOT NULL,
  issues_signature  text         NOT NULL,
  generated_at      timestamptz  NOT NULL DEFAULT now(),
  expires_at        timestamptz  NOT NULL DEFAULT (now() + interval '1 day')
);

CREATE INDEX IF NOT EXISTS ai_ageing_triage_cache_expires_at_idx
  ON public.ai_ageing_triage_cache (expires_at);

-- RLS: users only see/modify their own cache row. The Edge Function writes via
-- the caller's JWT context (auth.uid() = user_id), so own-row policies suffice;
-- the service-role pre-warm path (if added later) bypasses RLS.
ALTER TABLE public.ai_ageing_triage_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_ageing_triage_cache: users select own"
  ON public.ai_ageing_triage_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_ageing_triage_cache: users insert own"
  ON public.ai_ageing_triage_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_ageing_triage_cache: users update own"
  ON public.ai_ageing_triage_cache
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_ageing_triage_cache: users delete own"
  ON public.ai_ageing_triage_cache
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_ageing_triage_cache IS
  'Cache for Caty ageing-triage output (For You → Ageing "Review" button). One row per user, signature-invalidated (key+status+comments+assignee_inactive), daily TTL.';
