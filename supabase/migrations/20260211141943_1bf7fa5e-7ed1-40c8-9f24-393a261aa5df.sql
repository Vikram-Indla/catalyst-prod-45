
-- =============================================
-- GROUP 15: Release Management Schema Enrichment
-- =============================================

-- 1. Expand release_status enum with new values
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'planning';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'development';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'testing';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'uat';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'staging';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'released';
ALTER TYPE release_status ADD VALUE IF NOT EXISTS 'archived';

-- 2. Add missing columns to releases table
ALTER TABLE releases 
  ADD COLUMN IF NOT EXISTS release_manager_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS qa_lead_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS actual_release_date DATE,
  ADD COLUMN IF NOT EXISTS test_cases_executed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_cases_failed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_cases_blocked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_defects INTEGER DEFAULT 0;

-- 3. Create release_test_cycles junction table
CREATE TABLE IF NOT EXISTS release_test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES th_test_cycles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT release_cycles_unique UNIQUE (release_id, cycle_id)
);

-- 4. Enable RLS
ALTER TABLE release_test_cycles ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for release_test_cycles
CREATE POLICY "Authenticated users can view release test cycles"
  ON release_test_cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert release test cycles"
  ON release_test_cycles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete release test cycles"
  ON release_test_cycles FOR DELETE TO authenticated USING (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_release_test_cycles_release ON release_test_cycles(release_id);
CREATE INDEX IF NOT EXISTS idx_release_test_cycles_cycle ON release_test_cycles(cycle_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_health ON releases(health);
CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
