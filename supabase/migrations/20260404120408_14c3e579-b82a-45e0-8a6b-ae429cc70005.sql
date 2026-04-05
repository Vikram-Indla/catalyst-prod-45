ALTER TABLE th_test_executions
  ADD COLUMN IF NOT EXISTS cycle_scope_id uuid REFERENCES tm_cycle_scope(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execution_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS step_results jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_th_test_executions_cycle_scope
  ON th_test_executions(cycle_scope_id);

CREATE INDEX IF NOT EXISTS idx_th_test_executions_scope_number
  ON th_test_executions(cycle_scope_id, execution_number);