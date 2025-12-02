-- Drop existing tables if they exist
DROP TABLE IF EXISTS test_execution_defects CASCADE;
DROP TABLE IF EXISTS test_cycle_executions CASCADE;
DROP TABLE IF EXISTS test_cycles CASCADE;

-- Create test_cycles table (without FK constraint on project_id)
CREATE TABLE test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective TEXT,
  folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL,
  program_id UUID,
  owner_id UUID,
  status VARCHAR(50) DEFAULT 'not_started',
  start_date DATE,
  end_date DATE,
  environment VARCHAR(255),
  is_adhoc BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(program_id, key)
);

-- Create test_cycle_executions table
CREATE TABLE test_cycle_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES test_cycles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  case_version INTEGER DEFAULT 1,
  assigned_to UUID,
  status VARCHAR(50) DEFAULT 'not_executed',
  executed_at TIMESTAMP,
  executed_by UUID,
  effort_minutes INTEGER,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cycle_id, case_id)
);

-- Create test_execution_defects table
CREATE TABLE test_execution_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES test_cycle_executions(id) ON DELETE CASCADE,
  defect_work_item_id UUID NOT NULL,
  linked_at TIMESTAMP DEFAULT NOW(),
  linked_by UUID,
  UNIQUE(execution_id, defect_work_item_id)
);

-- Create indexes
CREATE INDEX idx_test_cycles_program ON test_cycles(program_id);
CREATE INDEX idx_test_cycles_folder ON test_cycles(folder_id);
CREATE INDEX idx_test_cycles_adhoc ON test_cycles(is_adhoc);
CREATE INDEX idx_test_cycle_executions_cycle ON test_cycle_executions(cycle_id);
CREATE INDEX idx_test_cycle_executions_assigned ON test_cycle_executions(assigned_to);
CREATE INDEX idx_test_cycle_executions_status ON test_cycle_executions(status);
CREATE INDEX idx_test_execution_defects_execution ON test_execution_defects(execution_id);

-- Enable RLS
ALTER TABLE test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cycle_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_defects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_cycles
CREATE POLICY "Users can view test cycles"
  ON test_cycles FOR SELECT
  USING (true);

CREATE POLICY "Users can create test cycles"
  ON test_cycles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update test cycles"
  ON test_cycles FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete test cycles"
  ON test_cycles FOR DELETE
  USING (NOT is_adhoc);

-- RLS Policies for test_cycle_executions
CREATE POLICY "Users can view executions"
  ON test_cycle_executions FOR SELECT
  USING (true);

CREATE POLICY "Users can create executions"
  ON test_cycle_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update executions"
  ON test_cycle_executions FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete executions"
  ON test_cycle_executions FOR DELETE
  USING (true);

-- RLS Policies for test_execution_defects
CREATE POLICY "Users can view defects"
  ON test_execution_defects FOR SELECT
  USING (true);

CREATE POLICY "Users can create defects"
  ON test_execution_defects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete defects"
  ON test_execution_defects FOR DELETE
  USING (true);