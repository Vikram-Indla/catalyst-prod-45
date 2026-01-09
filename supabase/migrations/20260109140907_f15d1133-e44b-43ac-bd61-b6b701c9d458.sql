-- Create tm_test_case_links table for linking test cases to stories, features, epics, defects, incidents
CREATE TABLE IF NOT EXISTS tm_test_case_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  linked_item_type VARCHAR(20) NOT NULL, -- 'story', 'feature', 'epic', 'defect', 'incident'
  linked_item_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_linked_item_type CHECK (linked_item_type IN ('story', 'feature', 'epic', 'defect', 'incident')),
  CONSTRAINT unique_test_case_link UNIQUE(test_case_id, linked_item_type, linked_item_id)
);

-- Enable RLS
ALTER TABLE tm_test_case_links ENABLE ROW LEVEL SECURITY;

-- Policies for tm_test_case_links
CREATE POLICY "Allow all users to view test case links"
  ON tm_test_case_links FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to create test case links"
  ON tm_test_case_links FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to delete test case links"
  ON tm_test_case_links FOR DELETE
  USING (true);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_test_case_links_test_case ON tm_test_case_links(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_links_item ON tm_test_case_links(linked_item_type, linked_item_id);

-- Add missing columns to tm_test_cases if they don't exist
DO $$
BEGIN
  -- Add project_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_test_cases' AND column_name = 'project_id') THEN
    ALTER TABLE tm_test_cases ADD COLUMN project_id UUID REFERENCES projects(id);
  END IF;
  
  -- Add release_version_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_test_cases' AND column_name = 'release_version_id') THEN
    ALTER TABLE tm_test_cases ADD COLUMN release_version_id UUID REFERENCES release_versions(id);
  END IF;
  
  -- Add test_type if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_test_cases' AND column_name = 'test_type') THEN
    ALTER TABLE tm_test_cases ADD COLUMN test_type VARCHAR(50) DEFAULT 'functional';
  END IF;
END $$;