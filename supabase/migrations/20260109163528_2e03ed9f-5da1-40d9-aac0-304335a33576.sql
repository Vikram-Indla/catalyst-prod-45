-- Add assigned_to column to tm_test_cases
ALTER TABLE tm_test_cases 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);

-- Index for filtering by assigned_to
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_assigned_to 
  ON tm_test_cases(assigned_to);

-- Comment for documentation
COMMENT ON COLUMN tm_test_cases.assigned_to IS 'User ID of the person assigned to this test case';