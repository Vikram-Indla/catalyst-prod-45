
-- Multi-Program Support Migration
-- A) Add program_id to features and create feature_projects join table

-- A1) Add program_id to features if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'features' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE features ADD COLUMN program_id uuid REFERENCES programs(id);
  END IF;
END $$;

-- A2) Create feature_projects many-to-many join table
CREATE TABLE IF NOT EXISTS feature_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(feature_id, project_id)
);

-- Enable RLS on feature_projects
ALTER TABLE feature_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_projects
CREATE POLICY "Feature projects are viewable by authenticated users"
ON feature_projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Feature projects are insertable by authenticated users"
ON feature_projects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Feature projects are deletable by authenticated users"
ON feature_projects FOR DELETE
TO authenticated
USING (true);

-- B) Add unique constraint on programs.key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'programs_key_unique' OR conname = 'programs_key_key'
  ) THEN
    ALTER TABLE programs ADD CONSTRAINT programs_key_unique UNIQUE (key);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- C) Ensure epics.program_id is NOT NULL with proper default
-- First, update any null program_ids to the first available program
UPDATE epics 
SET program_id = (SELECT id FROM programs WHERE status = 'active' AND id != '00000000-0000-0000-0000-000000000001' ORDER BY created_at LIMIT 1)
WHERE program_id IS NULL;

-- D) For features, inherit program_id from epic or use first program
UPDATE features f
SET program_id = COALESCE(
  (SELECT e.program_id FROM epics e WHERE e.id = f.epic_id),
  (SELECT id FROM programs WHERE status = 'active' AND id != '00000000-0000-0000-0000-000000000001' ORDER BY created_at LIMIT 1)
)
WHERE f.program_id IS NULL;

-- E) Migrate existing feature.project_id to feature_projects join table
INSERT INTO feature_projects (feature_id, project_id)
SELECT id, project_id FROM features 
WHERE project_id IS NOT NULL
ON CONFLICT (feature_id, project_id) DO NOTHING;

-- F) Add realtime for programs and feature_projects
ALTER PUBLICATION supabase_realtime ADD TABLE programs;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_projects;

-- G) Create index for faster program-scoped queries
CREATE INDEX IF NOT EXISTS idx_features_program_id ON features(program_id);
CREATE INDEX IF NOT EXISTS idx_epics_program_id ON epics(program_id);
CREATE INDEX IF NOT EXISTS idx_feature_projects_feature_id ON feature_projects(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_projects_project_id ON feature_projects(project_id);
