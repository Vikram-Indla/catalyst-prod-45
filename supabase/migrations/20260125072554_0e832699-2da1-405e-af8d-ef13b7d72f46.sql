-- Add priority and due_date columns to tm_cycle_scope for cycle-specific overrides
ALTER TABLE tm_cycle_scope 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tm_cycle_scope_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_updated_at ON tm_cycle_scope;
CREATE TRIGGER trg_tm_cycle_scope_updated_at
  BEFORE UPDATE ON tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION update_tm_cycle_scope_updated_at();

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_tm_cycle_scope_current_status ON tm_cycle_scope(current_status);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_scope_due_date ON tm_cycle_scope(due_date);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_scope_assigned_to ON tm_cycle_scope(assigned_to);