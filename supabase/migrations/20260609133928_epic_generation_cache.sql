-- Epic generation cache for BR-to-Epics decomposition.
-- Mirrors story_generation_cache pattern. PK = business_request UUID.

CREATE TABLE IF NOT EXISTS public.epic_generation_cache (
  br_id UUID PRIMARY KEY,
  content_hash TEXT NOT NULL,
  selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirement_units JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_epics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_epic_keys TEXT[] DEFAULT '{}',
  generation_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epic_gen_cache_hash
  ON public.epic_generation_cache (br_id, content_hash);

ALTER TABLE public.epic_generation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read epic generation cache"
  ON public.epic_generation_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert epic generation cache"
  ON public.epic_generation_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update epic generation cache"
  ON public.epic_generation_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_epic_gen_cache_updated_at
  BEFORE UPDATE ON public.epic_generation_cache
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
