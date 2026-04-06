-- Fix: Add in_progress to the status transition validation trigger
-- The enum has 'in_progress' but the trigger didn't include it
CREATE OR REPLACE FUNCTION validate_cycle_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions jsonb := '{
    "draft": ["planned", "archived"],
    "planned": ["active", "archived"],
    "active": ["paused", "completed"],
    "paused": ["active", "archived"],
    "in_progress": ["paused", "completed"],
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
