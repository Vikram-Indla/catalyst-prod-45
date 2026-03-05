
-- Add missing columns for Intelligence Panel
ALTER TABLE public.r360_ai_profiles
  ADD COLUMN IF NOT EXISTS fitness_score integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS behavioral_archetype text,
  ADD COLUMN IF NOT EXISTS archetype_description text,
  ADD COLUMN IF NOT EXISTS archetype_tags text[],
  ADD COLUMN IF NOT EXISTS pickup_latency jsonb;
