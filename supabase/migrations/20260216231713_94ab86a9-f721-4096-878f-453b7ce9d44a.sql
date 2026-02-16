
-- Add missing columns to releases table for ReleaseHub V2
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 85 CHECK (health_score >= 0 AND health_score <= 100),
  ADD COLUMN IF NOT EXISTS blocker_defects integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS major_defects integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minor_defects integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_cases_skipped integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stories_with_tests integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_stories integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gates integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passing_gates integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scope_creep_percent numeric(5,2) DEFAULT 0;

-- Add enum values if not present (development, staging already exist)
-- Add 'active' if missing — it's already in the enum so skip

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_releases_health_score ON public.releases(health_score);

-- Sync health_score from health enum for existing rows
UPDATE public.releases SET health_score = CASE
  WHEN health = 'critical' THEN 25
  WHEN health = 'at_risk' THEN 60
  WHEN health = 'healthy' THEN 85
  ELSE 85
END
WHERE health_score = 85 OR health_score IS NULL;
