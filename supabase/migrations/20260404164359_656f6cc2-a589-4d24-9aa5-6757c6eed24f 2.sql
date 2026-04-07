
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
  total_test_cases BIGINT,
  total_cycles BIGINT,
  active_cycles BIGINT,
  completed_cycles BIGINT,
  total_executed BIGINT,
  total_passed BIGINT,
  total_failed BIGINT,
  total_blocked BIGINT,
  total_skipped BIGINT,
  total_not_run BIGINT,
  overall_pass_rate NUMERIC,
  automation_coverage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM tm_test_cases)::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles)::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles WHERE status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles WHERE status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status IS DISTINCT FROM 'not_run')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'passed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'failed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'blocked')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'skipped')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'not_run')::BIGINT,
    COALESCE(
      ROUND(
        (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'passed')::NUMERIC * 100 /
        NULLIF((SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status IS DISTINCT FROM 'not_run'), 0),
        1
      ),
      0
    )::NUMERIC,
    COALESCE(
      ROUND(
        (SELECT COUNT(*) FROM tm_test_cases WHERE automation_status = 'automated')::NUMERIC * 100 /
        NULLIF((SELECT COUNT(*) FROM tm_test_cases), 0),
        1
      ),
      0
    )::NUMERIC;
END;
$$;
