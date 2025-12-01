-- ============================================
-- CATALYST TESTS: DATABASE SCHEMA MIGRATION
-- Phase 1 of 5: Database Foundation
-- ============================================

-- Create ENUM types for test management
CREATE TYPE test_type AS ENUM ('manual', 'automated', 'bdd');
CREATE TYPE test_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE test_case_status AS ENUM ('draft', 'approved', 'deprecated');
CREATE TYPE test_cycle_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE test_execution_status AS ENUM ('not_run', 'passed', 'failed', 'blocked', 'skipped');
CREATE TYPE test_step_status AS ENUM ('passed', 'failed', 'blocked', 'skipped');

-- ============================================
-- TABLE 1: test_folders
-- Hierarchical folder structure for organizing test cases
-- ============================================
CREATE TABLE test_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES test_folders(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_test_folders_parent ON test_folders(parent_folder_id);
CREATE INDEX idx_test_folders_team ON test_folders(team_id);
CREATE INDEX idx_test_folders_created_by ON test_folders(created_by);

-- ============================================
-- TABLE 2: test_cases
-- Core test case definitions
-- ============================================
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  preconditions TEXT,
  expected_result TEXT,
  test_type test_type NOT NULL DEFAULT 'manual',
  priority test_priority NOT NULL DEFAULT 'medium',
  status test_case_status NOT NULL DEFAULT 'draft',
  folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL,
  linked_work_item_type VARCHAR(50),
  linked_work_item_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_linked_work_item CHECK (
    (linked_work_item_type IS NULL AND linked_work_item_id IS NULL) OR
    (linked_work_item_type IS NOT NULL AND linked_work_item_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_test_cases_folder ON test_cases(folder_id);
CREATE INDEX idx_test_cases_status ON test_cases(status);
CREATE INDEX idx_test_cases_priority ON test_cases(priority);
CREATE INDEX idx_test_cases_type ON test_cases(test_type);
CREATE INDEX idx_test_cases_linked_work_item ON test_cases(linked_work_item_type, linked_work_item_id);
CREATE INDEX idx_test_cases_created_by ON test_cases(created_by);

-- ============================================
-- TABLE 3: test_steps
-- Individual steps within a test case
-- ============================================
CREATE TABLE test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_step_order_positive CHECK (step_order > 0)
);

-- Indexes for performance
CREATE INDEX idx_test_steps_test_case ON test_steps(test_case_id, step_order);

-- ============================================
-- TABLE 4: test_sets
-- Collections of related test cases
-- ============================================
CREATE TABLE test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_test_sets_team ON test_sets(team_id);
CREATE INDEX idx_test_sets_created_by ON test_sets(created_by);

-- ============================================
-- TABLE 5: test_set_cases
-- Many-to-many relationship between test sets and test cases
-- ============================================
CREATE TABLE test_set_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_set_id UUID NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  case_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_set_id, test_case_id)
);

-- Indexes for performance
CREATE INDEX idx_test_set_cases_set ON test_set_cases(test_set_id, case_order);
CREATE INDEX idx_test_set_cases_case ON test_set_cases(test_case_id);

-- ============================================
-- TABLE 6: test_cycles
-- Test execution cycles tied to sprints or PIs
-- ============================================
CREATE TABLE test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sprint_id UUID REFERENCES iterations(id) ON DELETE SET NULL,
  program_increment_id UUID REFERENCES program_increments(id) ON DELETE SET NULL,
  status test_cycle_status NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_cycle_dates CHECK (
    (start_date IS NULL OR end_date IS NULL) OR (start_date <= end_date)
  )
);

-- Indexes for performance
CREATE INDEX idx_test_cycles_sprint ON test_cycles(sprint_id);
CREATE INDEX idx_test_cycles_pi ON test_cycles(program_increment_id);
CREATE INDEX idx_test_cycles_status ON test_cycles(status);
CREATE INDEX idx_test_cycles_dates ON test_cycles(start_date, end_date);

-- ============================================
-- TABLE 7: test_executions
-- Individual test case execution records
-- ============================================
CREATE TABLE test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  test_cycle_id UUID NOT NULL REFERENCES test_cycles(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL,
  execution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status test_execution_status NOT NULL DEFAULT 'not_run',
  actual_result TEXT,
  defect_id UUID,
  execution_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_execution_time_positive CHECK (
    execution_time_seconds IS NULL OR execution_time_seconds >= 0
  )
);

-- Indexes for performance
CREATE INDEX idx_test_executions_test_case ON test_executions(test_case_id);
CREATE INDEX idx_test_executions_cycle ON test_executions(test_cycle_id);
CREATE INDEX idx_test_executions_status ON test_executions(status);
CREATE INDEX idx_test_executions_executed_by ON test_executions(executed_by);
CREATE INDEX idx_test_executions_defect ON test_executions(defect_id);

-- ============================================
-- TABLE 8: test_execution_steps
-- Step-by-step execution results
-- ============================================
CREATE TABLE test_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_execution_id UUID NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
  test_step_id UUID NOT NULL REFERENCES test_steps(id) ON DELETE CASCADE,
  status test_step_status NOT NULL,
  actual_result TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_test_execution_steps_execution ON test_execution_steps(test_execution_id);
CREATE INDEX idx_test_execution_steps_step ON test_execution_steps(test_step_id);

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_test_folders_updated_at
  BEFORE UPDATE ON test_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_steps_updated_at
  BEFORE UPDATE ON test_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_sets_updated_at
  BEFORE UPDATE ON test_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_cycles_updated_at
  BEFORE UPDATE ON test_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_executions_updated_at
  BEFORE UPDATE ON test_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_execution_steps_updated_at
  BEFORE UPDATE ON test_execution_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

-- ============================================
-- RLS POLICIES: Security policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE test_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_set_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_steps ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all test data
CREATE POLICY "Authenticated users can view test folders"
  ON test_folders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test cases"
  ON test_cases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test steps"
  ON test_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test sets"
  ON test_sets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test set cases"
  ON test_set_cases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test cycles"
  ON test_cycles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test executions"
  ON test_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view test execution steps"
  ON test_execution_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can create/update/delete test data
CREATE POLICY "Authenticated users can manage test folders"
  ON test_folders FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can manage test cases"
  ON test_cases FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = created_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage test steps"
  ON test_steps FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage test sets"
  ON test_sets FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can manage test set cases"
  ON test_set_cases FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage test cycles"
  ON test_cycles FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can manage test executions"
  ON test_executions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = executed_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage test execution steps"
  ON test_execution_steps FOR ALL
  USING (auth.uid() IS NOT NULL);