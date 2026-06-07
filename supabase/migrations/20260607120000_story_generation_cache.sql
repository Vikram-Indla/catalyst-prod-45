-- Story generation cache for deterministic, idempotent epic-to-stories decomposition.
-- Same content_hash → same proposals. Prevents duplicate generation and AI calls.

CREATE TABLE IF NOT EXISTS public.story_generation_cache (
  epic_key TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirement_units JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_stories JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_story_keys TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_story_gen_cache_hash
  ON public.story_generation_cache (epic_key, content_hash);

-- RLS: all authenticated users can read/write (non-PII cache data, UI gated by AdminGuard for admin)
ALTER TABLE public.story_generation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read story generation cache"
  ON public.story_generation_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert story generation cache"
  ON public.story_generation_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update story generation cache"
  ON public.story_generation_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_story_gen_cache_updated_at
  BEFORE UPDATE ON public.story_generation_cache
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
