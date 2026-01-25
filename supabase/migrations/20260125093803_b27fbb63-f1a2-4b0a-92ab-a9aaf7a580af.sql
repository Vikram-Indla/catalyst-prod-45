
-- =====================================================
-- CATALYST V5: Counter Synchronization Triggers
-- Step 1: Add missing in_progress_count column
-- =====================================================

ALTER TABLE public.tm_test_cycles 
ADD COLUMN IF NOT EXISTS in_progress_count integer DEFAULT 0;

-- =====================================================
-- Helper function to map status to counter column
-- =====================================================
CREATE OR REPLACE FUNCTION public.tm_get_counter_column(p_status text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_status
    WHEN 'not_run' THEN 'not_run_count'
    WHEN 'in_progress' THEN 'in_progress_count'
    WHEN 'passed' THEN 'passed_count'
    WHEN 'failed' THEN 'failed_count'
    WHEN 'blocked' THEN 'blocked_count'
    WHEN 'skipped' THEN 'skipped_count'
    ELSE NULL
  END;
END;
$$;

-- =====================================================
-- TRIGGER 1: Handle INSERT on tm_cycle_scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.tm_cycle_scope_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := COALESCE(NEW.current_status, 'not_run');
  
  UPDATE tm_test_cycles
  SET 
    total_cases = COALESCE(total_cases, 0) + 1,
    not_run_count = CASE WHEN v_status = 'not_run' THEN COALESCE(not_run_count, 0) + 1 ELSE not_run_count END,
    in_progress_count = CASE WHEN v_status = 'in_progress' THEN COALESCE(in_progress_count, 0) + 1 ELSE in_progress_count END,
    passed_count = CASE WHEN v_status = 'passed' THEN COALESCE(passed_count, 0) + 1 ELSE passed_count END,
    failed_count = CASE WHEN v_status = 'failed' THEN COALESCE(failed_count, 0) + 1 ELSE failed_count END,
    blocked_count = CASE WHEN v_status = 'blocked' THEN COALESCE(blocked_count, 0) + 1 ELSE blocked_count END,
    skipped_count = CASE WHEN v_status = 'skipped' THEN COALESCE(skipped_count, 0) + 1 ELSE skipped_count END,
    updated_at = now()
  WHERE id = NEW.cycle_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_insert ON public.tm_cycle_scope;
CREATE TRIGGER trg_tm_cycle_scope_insert
  AFTER INSERT ON public.tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_cycle_scope_insert_trigger();

-- =====================================================
-- TRIGGER 2: Handle UPDATE on tm_cycle_scope (status change)
-- =====================================================
CREATE OR REPLACE FUNCTION public.tm_cycle_scope_update_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    v_old_status := COALESCE(OLD.current_status, 'not_run');
    v_new_status := COALESCE(NEW.current_status, 'not_run');
    
    -- Decrement old status counter
    UPDATE tm_test_cycles
    SET 
      not_run_count = CASE WHEN v_old_status = 'not_run' THEN GREATEST(COALESCE(not_run_count, 0) - 1, 0) ELSE not_run_count END,
      in_progress_count = CASE WHEN v_old_status = 'in_progress' THEN GREATEST(COALESCE(in_progress_count, 0) - 1, 0) ELSE in_progress_count END,
      passed_count = CASE WHEN v_old_status = 'passed' THEN GREATEST(COALESCE(passed_count, 0) - 1, 0) ELSE passed_count END,
      failed_count = CASE WHEN v_old_status = 'failed' THEN GREATEST(COALESCE(failed_count, 0) - 1, 0) ELSE failed_count END,
      blocked_count = CASE WHEN v_old_status = 'blocked' THEN GREATEST(COALESCE(blocked_count, 0) - 1, 0) ELSE blocked_count END,
      skipped_count = CASE WHEN v_old_status = 'skipped' THEN GREATEST(COALESCE(skipped_count, 0) - 1, 0) ELSE skipped_count END,
      updated_at = now()
    WHERE id = NEW.cycle_id;
    
    -- Increment new status counter
    UPDATE tm_test_cycles
    SET 
      not_run_count = CASE WHEN v_new_status = 'not_run' THEN COALESCE(not_run_count, 0) + 1 ELSE not_run_count END,
      in_progress_count = CASE WHEN v_new_status = 'in_progress' THEN COALESCE(in_progress_count, 0) + 1 ELSE in_progress_count END,
      passed_count = CASE WHEN v_new_status = 'passed' THEN COALESCE(passed_count, 0) + 1 ELSE passed_count END,
      failed_count = CASE WHEN v_new_status = 'failed' THEN COALESCE(failed_count, 0) + 1 ELSE failed_count END,
      blocked_count = CASE WHEN v_new_status = 'blocked' THEN COALESCE(blocked_count, 0) + 1 ELSE blocked_count END,
      skipped_count = CASE WHEN v_new_status = 'skipped' THEN COALESCE(skipped_count, 0) + 1 ELSE skipped_count END,
      updated_at = now()
    WHERE id = NEW.cycle_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_update ON public.tm_cycle_scope;
CREATE TRIGGER trg_tm_cycle_scope_update
  AFTER UPDATE ON public.tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_cycle_scope_update_trigger();

-- =====================================================
-- TRIGGER 3: Handle DELETE on tm_cycle_scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.tm_cycle_scope_delete_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := COALESCE(OLD.current_status, 'not_run');
  
  UPDATE tm_test_cycles
  SET 
    total_cases = GREATEST(COALESCE(total_cases, 0) - 1, 0),
    not_run_count = CASE WHEN v_status = 'not_run' THEN GREATEST(COALESCE(not_run_count, 0) - 1, 0) ELSE not_run_count END,
    in_progress_count = CASE WHEN v_status = 'in_progress' THEN GREATEST(COALESCE(in_progress_count, 0) - 1, 0) ELSE in_progress_count END,
    passed_count = CASE WHEN v_status = 'passed' THEN GREATEST(COALESCE(passed_count, 0) - 1, 0) ELSE passed_count END,
    failed_count = CASE WHEN v_status = 'failed' THEN GREATEST(COALESCE(failed_count, 0) - 1, 0) ELSE failed_count END,
    blocked_count = CASE WHEN v_status = 'blocked' THEN GREATEST(COALESCE(blocked_count, 0) - 1, 0) ELSE blocked_count END,
    skipped_count = CASE WHEN v_status = 'skipped' THEN GREATEST(COALESCE(skipped_count, 0) - 1, 0) ELSE skipped_count END,
    updated_at = now()
  WHERE id = OLD.cycle_id;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_delete ON public.tm_cycle_scope;
CREATE TRIGGER trg_tm_cycle_scope_delete
  AFTER DELETE ON public.tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_cycle_scope_delete_trigger();

-- =====================================================
-- MANUAL RECALCULATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.tm_recalculate_cycle_counters(p_cycle_id uuid DEFAULT NULL)
RETURNS TABLE(cycle_id uuid, total_cases bigint, not_run_count bigint, in_progress_count bigint, passed_count bigint, failed_count bigint, blocked_count bigint, skipped_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update counters for specified cycle or all cycles
  UPDATE tm_test_cycles tc
  SET 
    total_cases = COALESCE(counts.total, 0)::integer,
    not_run_count = COALESCE(counts.not_run, 0)::integer,
    in_progress_count = COALESCE(counts.in_prog, 0)::integer,
    passed_count = COALESCE(counts.passed, 0)::integer,
    failed_count = COALESCE(counts.failed, 0)::integer,
    blocked_count = COALESCE(counts.blocked, 0)::integer,
    skipped_count = COALESCE(counts.skipped, 0)::integer,
    updated_at = now()
  FROM (
    SELECT 
      cs.cycle_id as cid,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE COALESCE(cs.current_status, 'not_run') = 'not_run') as not_run,
      COUNT(*) FILTER (WHERE cs.current_status = 'in_progress') as in_prog,
      COUNT(*) FILTER (WHERE cs.current_status = 'passed') as passed,
      COUNT(*) FILTER (WHERE cs.current_status = 'failed') as failed,
      COUNT(*) FILTER (WHERE cs.current_status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE cs.current_status = 'skipped') as skipped
    FROM tm_cycle_scope cs
    WHERE (p_cycle_id IS NULL OR cs.cycle_id = p_cycle_id)
    GROUP BY cs.cycle_id
  ) counts
  WHERE tc.id = counts.cid
    AND (p_cycle_id IS NULL OR tc.id = p_cycle_id);
  
  -- Reset counters for cycles with no scope entries
  UPDATE tm_test_cycles tc
  SET 
    total_cases = 0,
    not_run_count = 0,
    in_progress_count = 0,
    passed_count = 0,
    failed_count = 0,
    blocked_count = 0,
    skipped_count = 0,
    updated_at = now()
  WHERE (p_cycle_id IS NULL OR tc.id = p_cycle_id)
    AND NOT EXISTS (SELECT 1 FROM tm_cycle_scope cs WHERE cs.cycle_id = tc.id);
  
  -- Return updated values
  RETURN QUERY
  SELECT 
    tc.id,
    tc.total_cases::bigint,
    tc.not_run_count::bigint,
    COALESCE(tc.in_progress_count, 0)::bigint,
    tc.passed_count::bigint,
    tc.failed_count::bigint,
    tc.blocked_count::bigint,
    tc.skipped_count::bigint
  FROM tm_test_cycles tc
  WHERE (p_cycle_id IS NULL OR tc.id = p_cycle_id);
END;
$$;

-- =====================================================
-- ONE-TIME SYNC: Recalculate all existing cycle counters
-- =====================================================
SELECT public.tm_recalculate_cycle_counters(NULL);

-- Documentation comments
COMMENT ON FUNCTION public.tm_recalculate_cycle_counters IS 'Recalculates cached counters in tm_test_cycles from tm_cycle_scope. Pass NULL for all cycles.';
COMMENT ON FUNCTION public.tm_cycle_scope_insert_trigger IS 'Trigger: increments tm_test_cycles counters on scope INSERT';
COMMENT ON FUNCTION public.tm_cycle_scope_update_trigger IS 'Trigger: adjusts tm_test_cycles counters on scope status UPDATE';
COMMENT ON FUNCTION public.tm_cycle_scope_delete_trigger IS 'Trigger: decrements tm_test_cycles counters on scope DELETE';
