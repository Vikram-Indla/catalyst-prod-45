-- Drop existing tables if they have schema issues
DROP TABLE IF EXISTS test_set_cases CASCADE;
DROP TABLE IF EXISTS test_sets CASCADE;

-- Create test_sets table
CREATE TABLE test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective TEXT,
  folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL,
  program_id UUID NOT NULL,
  owner_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES test_sets(id),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create test_set_cases table
CREATE TABLE test_set_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  case_version INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID,
  UNIQUE(set_id, case_id)
);

-- Create indexes
CREATE INDEX idx_test_sets_program ON test_sets(program_id);
CREATE INDEX idx_test_sets_folder ON test_sets(folder_id);
CREATE INDEX idx_test_sets_status ON test_sets(status);
CREATE INDEX idx_test_set_cases_set ON test_set_cases(set_id);
CREATE INDEX idx_test_set_cases_case ON test_set_cases(case_id);

-- Enable RLS
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_set_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_sets
CREATE POLICY "Users can view test sets"
  ON test_sets FOR SELECT
  USING (true);

CREATE POLICY "Users can create test sets"
  ON test_sets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update test sets"
  ON test_sets FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete test sets"
  ON test_sets FOR DELETE
  USING (true);

-- RLS policies for test_set_cases
CREATE POLICY "Users can view test set cases"
  ON test_set_cases FOR SELECT
  USING (true);

CREATE POLICY "Users can add cases to sets"
  ON test_set_cases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update set cases"
  ON test_set_cases FOR UPDATE
  USING (true);

CREATE POLICY "Users can remove cases from sets"
  ON test_set_cases FOR DELETE
  USING (true);