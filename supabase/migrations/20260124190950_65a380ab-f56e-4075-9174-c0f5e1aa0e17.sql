-- ============================================================================
-- Test Cycle Lifecycle Extension - Step 2: Add Transition Validation
-- ============================================================================

-- Update default for new cycles to 'draft'
ALTER TABLE tm_test_cycles ALTER COLUMN status SET DEFAULT 'draft';

-- Create a function to validate status transitions
CREATE OR REPLACE FUNCTION validate_cycle_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions jsonb := '{
    "draft": ["planned", "archived"],
    "planned": ["active", "archived"],
    "active": ["paused", "completed"],
    "paused": ["active", "archived"],
    "completed": ["archived"]
  }'::jsonb;
  allowed_next_states jsonb;
BEGIN
  -- Skip validation if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get allowed transitions for current status
  allowed_next_states := allowed_transitions->OLD.status::text;
  
  -- Check if the new status is in the allowed list
  IF allowed_next_states IS NULL OR NOT (allowed_next_states ? NEW.status::text) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Allowed transitions: %', 
      OLD.status, 
      NEW.status, 
      COALESCE(allowed_next_states::text, 'none');
  END IF;
  
  -- Set actual_start when transitioning to active
  IF NEW.status = 'active' AND OLD.status IN ('planned', 'draft') AND NEW.actual_start IS NULL THEN
    NEW.actual_start := NOW();
  END IF;
  
  -- Set actual_end when transitioning to completed
  IF NEW.status = 'completed' AND NEW.actual_end IS NULL THEN
    NEW.actual_end := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for status transition validation
DROP TRIGGER IF EXISTS trg_validate_cycle_status_transition ON tm_test_cycles;
CREATE TRIGGER trg_validate_cycle_status_transition
  BEFORE UPDATE ON tm_test_cycles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_cycle_status_transition();

-- Add comment for documentation
COMMENT ON FUNCTION validate_cycle_status_transition() IS 
'Enforces valid status transitions for test cycles:
  draft → planned | archived
  planned → active | archived  
  active → paused | completed
  paused → active | archived
  completed → archived
Also auto-sets actual_start/actual_end timestamps on relevant transitions.';