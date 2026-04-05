-- Step 1: Replace the trigger function to allow in_progress → active for cleanup,
-- then establish the correct FSM without in_progress
CREATE OR REPLACE FUNCTION public.validate_cycle_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_transitions jsonb := '{
    "draft": ["active", "archived"],
    "active": ["paused", "completed", "archived"],
    "paused": ["active", "archived"],
    "completed": ["archived"],
    "in_progress": ["active", "paused", "completed", "archived"]
  }'::jsonb;
  allowed_next_states jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  allowed_next_states := allowed_transitions->OLD.status::text;
  
  IF allowed_next_states IS NULL OR NOT (allowed_next_states ? NEW.status::text) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Allowed transitions: %', 
      OLD.status, 
      NEW.status, 
      COALESCE(allowed_next_states::text, 'none');
  END IF;
  
  IF NEW.status = 'active' AND OLD.status IN ('planned', 'draft', 'paused', 'in_progress') AND NEW.actual_start IS NULL THEN
    NEW.actual_start := NOW();
  END IF;
  
  IF NEW.status = 'completed' AND NEW.actual_end IS NULL THEN
    NEW.actual_end := NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;