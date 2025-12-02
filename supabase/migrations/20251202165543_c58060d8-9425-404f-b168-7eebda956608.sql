-- Create test_datasets table for data-driven testing
CREATE TABLE IF NOT EXISTS test_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES test_cycles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(cycle_id, name)
);

-- Create test_execution_runs table for run tracking
CREATE TABLE IF NOT EXISTS test_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES test_cycles(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  run_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  copied_from_run_id UUID REFERENCES test_execution_runs(id),
  UNIQUE(cycle_id, run_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_datasets_cycle ON test_datasets(cycle_id);
CREATE INDEX IF NOT EXISTS idx_test_execution_runs_cycle ON test_execution_runs(cycle_id);

-- Enable RLS
ALTER TABLE test_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_datasets
CREATE POLICY "Users can view test datasets" ON test_datasets FOR SELECT USING (true);
CREATE POLICY "Users can create test datasets" ON test_datasets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update test datasets" ON test_datasets FOR UPDATE USING (true);
CREATE POLICY "Users can delete test datasets" ON test_datasets FOR DELETE USING (true);

-- RLS policies for test_execution_runs
CREATE POLICY "Users can view execution runs" ON test_execution_runs FOR SELECT USING (true);
CREATE POLICY "Users can create execution runs" ON test_execution_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update execution runs" ON test_execution_runs FOR UPDATE USING (true);
CREATE POLICY "Users can delete execution runs" ON test_execution_runs FOR DELETE USING (true);

-- Seed initial run for existing cycles that actually exist
INSERT INTO test_execution_runs (cycle_id, run_number, run_name, created_at)
SELECT DISTINCT e.test_cycle_id, 1, 'Run 1', NOW()
FROM test_executions e
INNER JOIN test_cycles c ON c.id = e.test_cycle_id
WHERE e.test_cycle_id IS NOT NULL
ON CONFLICT (cycle_id, run_number) DO NOTHING;