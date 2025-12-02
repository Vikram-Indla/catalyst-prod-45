-- Enhance test_cycle_executions table with execution tracking fields
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS overall_status_override BOOLEAN DEFAULT false;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS manual_status VARCHAR(50);
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS effort_estimated INTEGER;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS effort_actual INTEGER;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS timer_start_at TIMESTAMP;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMP;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS timer_accumulated_seconds INTEGER DEFAULT 0;
ALTER TABLE test_cycle_executions ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;

-- Create test_execution_step_results table
CREATE TABLE IF NOT EXISTS test_execution_step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES test_cycle_executions(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_description TEXT NOT NULL,
  expected_result TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'not_executed',
  actual_result TEXT,
  comments TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_step_status CHECK (status IN ('not_executed', 'passed', 'failed', 'blocked', 'skipped'))
);

-- Create test_execution_evidence table
CREATE TABLE IF NOT EXISTS test_execution_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES test_cycle_executions(id) ON DELETE CASCADE,
  step_order INTEGER,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_execution_step_results_execution ON test_execution_step_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_evidence_execution ON test_execution_evidence(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_evidence_step ON test_execution_evidence(execution_id, step_order);

-- Enable RLS
ALTER TABLE test_execution_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_execution_step_results
CREATE POLICY "Users can view step results in their program" ON test_execution_step_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_cycle_executions tce
      JOIN test_cycles tc ON tce.cycle_id = tc.id
      WHERE tce.id = execution_id
    )
  );

CREATE POLICY "Users can insert step results" ON test_execution_step_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM test_cycle_executions tce
      JOIN test_cycles tc ON tce.cycle_id = tc.id
      WHERE tce.id = execution_id
    )
  );

CREATE POLICY "Users can update step results" ON test_execution_step_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM test_cycle_executions tce
      JOIN test_cycles tc ON tce.cycle_id = tc.id
      WHERE tce.id = execution_id
    )
  );

-- RLS Policies for test_execution_evidence
CREATE POLICY "Users can view evidence in their program" ON test_execution_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_cycle_executions tce
      JOIN test_cycles tc ON tce.cycle_id = tc.id
      WHERE tce.id = execution_id
    )
  );

CREATE POLICY "Users can upload evidence" ON test_execution_evidence
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM test_cycle_executions tce
      JOIN test_cycles tc ON tce.cycle_id = tc.id
      WHERE tce.id = execution_id
    )
  );

CREATE POLICY "Users can delete their own evidence" ON test_execution_evidence
  FOR DELETE USING (auth.uid() = uploaded_by);