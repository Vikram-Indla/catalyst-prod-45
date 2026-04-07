
DROP FUNCTION IF EXISTS public.get_plan_progress(UUID);

CREATE OR REPLACE FUNCTION public.get_plan_progress(p_plan_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total        INT := 0;
  v_executed     INT := 0;
  v_passed       INT := 0;
  v_failed       INT := 0;
  v_blocked      INT := 0;
  v_progress_pct NUMERIC := 0;
  v_pass_rate    NUMERIC := 0;
BEGIN
  -- Total scope items across all cycles linked to this plan
  SELECT COUNT(*)
  INTO v_total
  FROM tm_cycle_scope cs
  WHERE cs.cycle_id IN (
    SELECT cycle_id FROM plan_test_cycles WHERE plan_id = p_plan_id
  );

  -- Passed
  SELECT COUNT(*)
  INTO v_passed
  FROM tm_cycle_scope cs
  WHERE cs.cycle_id IN (
    SELECT cycle_id FROM plan_test_cycles WHERE plan_id = p_plan_id
  )
  AND cs.current_status = 'passed';

  -- Failed
  SELECT COUNT(*)
  INTO v_failed
  FROM tm_cycle_scope cs
  WHERE cs.cycle_id IN (
    SELECT cycle_id FROM plan_test_cycles WHERE plan_id = p_plan_id
  )
  AND cs.current_status = 'failed';

  -- Blocked
  SELECT COUNT(*)
  INTO v_blocked
  FROM tm_cycle_scope cs
  WHERE cs.cycle_id IN (
    SELECT cycle_id FROM plan_test_cycles WHERE plan_id = p_plan_id
  )
  AND cs.current_status = 'blocked';

  -- Executed = passed + failed + blocked
  v_executed := v_passed + v_failed + v_blocked;

  -- Progress = executed / total × 100
  IF v_total > 0 THEN
    v_progress_pct := ROUND((v_executed::NUMERIC / v_total) * 100, 1);
  END IF;

  -- Pass rate = passed / executed × 100 (F-05 standard)
  IF v_executed > 0 THEN
    v_pass_rate := ROUND((v_passed::NUMERIC / v_executed) * 100, 1);
  END IF;

  RETURN json_build_object(
    'total_tests',       v_total,
    'executed',          v_executed,
    'passed',            v_passed,
    'failed',            v_failed,
    'blocked',           v_blocked,
    'remaining',         GREATEST(v_total - v_executed, 0),
    'progress_percent',  v_progress_pct,
    'pass_rate',         v_pass_rate
  );
END;
$$;
