-- Add is_adhoc flag to test_cycles table
ALTER TABLE test_cycles ADD COLUMN IF NOT EXISTS is_adhoc BOOLEAN DEFAULT false;

-- Create test_activity_log table for activity feed
CREATE TABLE IF NOT EXISTS test_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_title VARCHAR(500),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_activity_created ON test_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_activity_user ON test_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_cycles_adhoc ON test_cycles(is_adhoc) WHERE is_adhoc = true;

-- Enable RLS on test_activity_log
ALTER TABLE test_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_activity_log
CREATE POLICY "Users can view all activity logs"
  ON test_activity_log FOR SELECT
  USING (true);

CREATE POLICY "Users can create activity logs"
  ON test_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to create Adhoc cycle for a project (idempotent)
CREATE OR REPLACE FUNCTION create_adhoc_cycle()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  adhoc_cycle_id UUID;
BEGIN
  -- Check if Adhoc cycle already exists
  SELECT id INTO adhoc_cycle_id
  FROM test_cycles
  WHERE is_adhoc = true
  LIMIT 1;

  -- If not, create it
  IF adhoc_cycle_id IS NULL THEN
    INSERT INTO test_cycles (
      name,
      description,
      status,
      is_adhoc,
      created_by,
      created_at
    ) VALUES (
      'Adhoc Cycle',
      'Default cycle for unplanned testing. Created automatically.',
      'active',
      true,
      auth.uid(),
      NOW()
    )
    RETURNING id INTO adhoc_cycle_id;
  END IF;

  RETURN adhoc_cycle_id;
END;
$$;