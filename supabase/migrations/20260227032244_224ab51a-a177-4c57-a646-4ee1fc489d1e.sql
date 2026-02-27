-- Add data_fingerprint column to r360_ai_cache for skip-if-unchanged logic
ALTER TABLE public.r360_ai_cache ADD COLUMN IF NOT EXISTS data_fingerprint TEXT;