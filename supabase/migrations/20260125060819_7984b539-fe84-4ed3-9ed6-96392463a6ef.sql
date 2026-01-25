-- ============================================================================
-- TRIGGER: Sync tm_test_cycles counters when tm_cycle_scope changes
-- This keeps cached counters in sync for list views while tm_cycle_scope 
-- remains the source of truth for detail views.
-- ============================================================================

-- Function to recalculate and update cycle counters
CREATE OR REPLACE FUNCTION public.sync_cycle_scope_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id UUID;
  v_total INT;
  v_passed INT;
  v_failed INT;
  v_blocked INT;
  v_skipped INT;
  v_not_run INT;
BEGIN
  -- Determine which cycle_id to update
  IF TG_OP = 'DELETE' THEN
    v_cycle_id := OLD.cycle_id;
  ELSE
    v_cycle_id := NEW.cycle_id;
  END IF;

  -- Count stats from tm_cycle_scope (source of truth)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE current_status = 'passed'),
    COUNT(*) FILTER (WHERE current_status = 'failed'),
    COUNT(*) FILTER (WHERE current_status = 'blocked'),
    COUNT(*) FILTER (WHERE current_status = 'skipped'),
    COUNT(*) FILTER (WHERE current_status IS NULL OR current_status = 'not_run')
  INTO v_total, v_passed, v_failed, v_blocked, v_skipped, v_not_run
  FROM tm_cycle_scope
  WHERE cycle_id = v_cycle_id;

  -- Update the cached counters on tm_test_cycles
  UPDATE tm_test_cycles
  SET 
    total_cases = v_total,
    passed_count = v_passed,
    failed_count = v_failed,
    blocked_count = v_blocked,
    skipped_count = v_skipped,
    not_run_count = v_not_run,
    updated_at = NOW()
  WHERE id = v_cycle_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_cycle_scope_counters ON tm_cycle_scope;

-- Create trigger for INSERT, UPDATE, DELETE on tm_cycle_scope
CREATE TRIGGER trg_sync_cycle_scope_counters
AFTER INSERT OR UPDATE OR DELETE ON tm_cycle_scope
FOR EACH ROW
EXECUTE FUNCTION sync_cycle_scope_counters();