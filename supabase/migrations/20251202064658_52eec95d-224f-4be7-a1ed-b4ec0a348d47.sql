-- ============================================
-- TEST CASE CREATION ENHANCEMENTS
-- Add columns and tables for comprehensive case management
-- ============================================

-- Add new enum values to test_case_status
ALTER TYPE test_case_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE test_case_status ADD VALUE IF NOT EXISTS 'published';

-- Add new columns to test_cases
ALTER TABLE test_cases 
ADD COLUMN IF NOT EXISTS objective TEXT,
ADD COLUMN IF NOT EXISTS component VARCHAR(255),
ADD COLUMN IF NOT EXISTS release VARCHAR(255),
ADD COLUMN IF NOT EXISTS estimated_effort INTEGER,
ADD COLUMN IF NOT EXISTS automation_status VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS automation_owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS automation_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS case_type VARCHAR(50) DEFAULT 'functional',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS labels TEXT[],
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- ============================================
-- TEST CASE STEPS TABLE (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS test_case_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  case_version INTEGER DEFAULT 1,
  step_number INTEGER NOT NULL,
  step_type VARCHAR(50) DEFAULT 'action',
  description TEXT NOT NULL,
  expected_result TEXT,
  test_data TEXT,
  attachment_urls TEXT[],
  is_bdd BOOLEAN DEFAULT false,
  bdd_keyword VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, case_version, step_number)
);

CREATE INDEX IF NOT EXISTS idx_case_steps_case ON test_case_steps(case_id, case_version);

-- ============================================
-- TEST CASE PARAMETERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS test_case_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  parameter_name VARCHAR(100) NOT NULL,
  parameter_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, parameter_name)
);

-- ============================================
-- TEST CASE DATASETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS test_case_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  dataset_name VARCHAR(255) NOT NULL,
  parameter_values JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_datasets_case ON test_case_datasets(case_id);

-- ============================================
-- TEST CASE WORK ITEM LINKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS test_case_work_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL,
  work_item_type VARCHAR(50),
  linked_at TIMESTAMP DEFAULT NOW(),
  linked_by UUID REFERENCES auth.users(id),
  UNIQUE(case_id, work_item_id)
);

CREATE INDEX IF NOT EXISTS idx_case_requirements ON test_case_work_item_links(case_id);
CREATE INDEX IF NOT EXISTS idx_work_item_requirements ON test_case_work_item_links(work_item_id);

-- ============================================
-- TEST CASE VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS test_case_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  preconditions TEXT,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, version)
);

CREATE INDEX IF NOT EXISTS idx_case_versions ON test_case_versions(case_id, version);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_work_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view test case steps" ON test_case_steps;
DROP POLICY IF EXISTS "Users can create test case steps" ON test_case_steps;
DROP POLICY IF EXISTS "Users can update test case steps" ON test_case_steps;
DROP POLICY IF EXISTS "Users can delete test case steps" ON test_case_steps;

DROP POLICY IF EXISTS "Users can view parameters" ON test_case_parameters;
DROP POLICY IF EXISTS "Users can create parameters" ON test_case_parameters;
DROP POLICY IF EXISTS "Users can update parameters" ON test_case_parameters;
DROP POLICY IF EXISTS "Users can delete parameters" ON test_case_parameters;

DROP POLICY IF EXISTS "Users can view datasets" ON test_case_datasets;
DROP POLICY IF EXISTS "Users can create datasets" ON test_case_datasets;
DROP POLICY IF EXISTS "Users can update datasets" ON test_case_datasets;
DROP POLICY IF EXISTS "Users can delete datasets" ON test_case_datasets;

DROP POLICY IF EXISTS "Users can view work item links" ON test_case_work_item_links;
DROP POLICY IF EXISTS "Users can create work item links" ON test_case_work_item_links;
DROP POLICY IF EXISTS "Users can delete work item links" ON test_case_work_item_links;

DROP POLICY IF EXISTS "Users can view versions" ON test_case_versions;
DROP POLICY IF EXISTS "Users can create versions" ON test_case_versions;

-- Create new policies for test_case_steps
CREATE POLICY "Users can view test case steps"
  ON test_case_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create test case steps"
  ON test_case_steps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update test case steps"
  ON test_case_steps FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete test case steps"
  ON test_case_steps FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for test_case_parameters
CREATE POLICY "Users can view parameters"
  ON test_case_parameters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create parameters"
  ON test_case_parameters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update parameters"
  ON test_case_parameters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete parameters"
  ON test_case_parameters FOR DELETE TO authenticated USING (true);

-- Create policies for test_case_datasets
CREATE POLICY "Users can view datasets"
  ON test_case_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create datasets"
  ON test_case_datasets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update datasets"
  ON test_case_datasets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete datasets"
  ON test_case_datasets FOR DELETE TO authenticated USING (true);

-- Create policies for test_case_work_item_links
CREATE POLICY "Users can view work item links"
  ON test_case_work_item_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create work item links"
  ON test_case_work_item_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete work item links"
  ON test_case_work_item_links FOR DELETE TO authenticated USING (true);

-- Create policies for test_case_versions
CREATE POLICY "Users can view versions"
  ON test_case_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create versions"
  ON test_case_versions FOR INSERT TO authenticated WITH CHECK (true);