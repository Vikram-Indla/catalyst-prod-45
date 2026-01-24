-- Phase 3: Data-Driven Test Execution (DDT) - Add linking columns
-- Link test runs to specific test data rows for data-driven testing

-- Add DDT columns to tm_test_runs table
ALTER TABLE tm_test_runs
ADD COLUMN IF NOT EXISTS test_data_row_id uuid REFERENCES test_data_rows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS test_data_row_snapshot jsonb,
ADD COLUMN IF NOT EXISTS test_data_row_number integer;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tm_test_runs_data_row_id 
ON tm_test_runs(test_data_row_id);

CREATE INDEX IF NOT EXISTS idx_tm_test_runs_scope_data_row 
ON tm_test_runs(cycle_scope_id, test_data_row_id);

-- Add comment for documentation
COMMENT ON COLUMN tm_test_runs.test_data_row_id IS 'Reference to test_data_rows for data-driven execution';
COMMENT ON COLUMN tm_test_runs.test_data_row_snapshot IS 'Snapshot of row_data at execution start for traceability';
COMMENT ON COLUMN tm_test_runs.test_data_row_number IS 'Display number (row_order + 1) for UI purposes';