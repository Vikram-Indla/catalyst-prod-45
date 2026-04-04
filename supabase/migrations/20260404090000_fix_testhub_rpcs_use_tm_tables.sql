-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Update TestHub RPCs to use canonical tm_* tables instead of th_*
-- Root cause: get_dashboard_stats and get_my_stats read from th_* tables
-- but all execution/cycle data is written to tm_* tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Fix get_dashboard_stats to use tm_* tables
CREATE OR REPLACE FUNCTION get_dashboard_stats()
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
  overall_pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM tm_test_cases)::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles)::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles WHERE status IN ('active', 'in_progress'))::BIGINT,
    (SELECT COUNT(*) FROM tm_test_cycles WHERE status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status != 'not_run')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'passed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'failed')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'blocked')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'skipped')::BIGINT,
    (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'not_run')::BIGINT,
    COALESCE(
      ROUND(
        (SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status = 'passed')::NUMERIC * 100 /
        NULLIF((SELECT COUNT(*) FROM tm_cycle_scope WHERE current_status != 'not_run'), 0),
        1
      ),
      0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix get_my_stats to use tm_* tables
CREATE OR REPLACE FUNCTION public.get_my_stats(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_assigned', COUNT(*),
    'remaining', COUNT(*) FILTER (WHERE cs.current_status = 'not_run'),
    'passed_count', COUNT(*) FILTER (WHERE cs.current_status = 'passed'),
    'failed_count', COUNT(*) FILTER (WHERE cs.current_status = 'failed'),
    'blocked_count', COUNT(*) FILTER (WHERE cs.current_status = 'blocked'),
    'executed_today', COUNT(*) FILTER (WHERE cs.updated_at::date = CURRENT_DATE AND cs.current_status != 'not_run'),
    'executed_this_week', COUNT(*) FILTER (WHERE cs.updated_at >= date_trunc('week', CURRENT_DATE) AND cs.current_status != 'not_run'),
    'pass_rate', CASE
      WHEN COUNT(*) FILTER (WHERE cs.current_status IN ('passed','failed')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE cs.current_status = 'passed')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE cs.current_status IN ('passed','failed')), 0) * 100, 1
      )
      ELSE 0
    END
  ) INTO v_result
  FROM tm_cycle_scope cs
  JOIN tm_test_cycles c ON cs.cycle_id = c.id
  WHERE cs.assigned_to = p_user_id
    AND c.status IN ('active', 'in_progress');

  RETURN COALESCE(v_result, '{"total_assigned":0,"remaining":0,"passed_count":0,"failed_count":0,"blocked_count":0,"executed_today":0,"executed_this_week":0,"pass_rate":0}'::json);
END;
$$;

-- 3. Fix tm_get_requirement_test_cases to use tm_cycle_scope instead of tm_test_executions
CREATE OR REPLACE FUNCTION tm_get_requirement_test_cases(
  p_requirement_type TEXT,
  p_requirement_id UUID
)
RETURNS TABLE (
  test_case_id UUID,
  case_key VARCHAR,
  title VARCHAR,
  test_case_status TEXT,
  test_case_priority TEXT,
  link_type TEXT,
  coverage_status TEXT,
  last_execution_status TEXT,
  last_execution_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as test_case_id,
    tc.case_key,
    tc.title,
    tc.status::TEXT as test_case_status,
    COALESCE(p.name, 'unset')::TEXT as test_case_priority,
    rl.link_type,
    rl.coverage_status,
    (
      SELECT cs.current_status::TEXT
      FROM tm_cycle_scope cs
      WHERE cs.test_case_id = tc.id
      ORDER BY cs.updated_at DESC NULLS LAST, cs.added_at DESC
      LIMIT 1
    ) as last_execution_status,
    (
      SELECT cs.updated_at
      FROM tm_cycle_scope cs
      WHERE cs.test_case_id = tc.id
      ORDER BY cs.updated_at DESC NULLS LAST, cs.added_at DESC
      LIMIT 1
    ) as last_execution_date
  FROM tm_requirement_links rl
  JOIN tm_test_cases tc ON tc.id = rl.test_case_id
  LEFT JOIN tm_case_priorities p ON p.id = tc.priority_id
  WHERE rl.requirement_type = p_requirement_type
    AND rl.requirement_id = p_requirement_id
  ORDER BY tc.case_key;
END;
$$;
