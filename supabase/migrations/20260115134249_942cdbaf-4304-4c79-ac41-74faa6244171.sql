-- Add missing columns to releases table for All Releases page
ALTER TABLE public.releases
ADD COLUMN IF NOT EXISTS version VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS test_cases_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS test_cases_passed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS defects_open INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coverage_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Set default version for existing rows
UPDATE public.releases SET version = 'v1.0' WHERE version IS NULL;

-- Add NOT NULL constraint to version after populating existing rows
ALTER TABLE public.releases ALTER COLUMN version SET NOT NULL;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_project ON public.releases(project_id);
CREATE INDEX IF NOT EXISTS idx_releases_owner ON public.releases(owner_id);
CREATE INDEX IF NOT EXISTS idx_releases_target_date ON public.releases(target_date);
CREATE INDEX IF NOT EXISTS idx_releases_health ON public.releases(health);

-- Add comments
COMMENT ON COLUMN public.releases.version IS 'Version label like v1.0, v2.1';
COMMENT ON COLUMN public.releases.health IS 'Health status: none, good, warning, critical';
COMMENT ON COLUMN public.releases.progress IS 'Completion percentage 0-100';