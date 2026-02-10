
-- G5-01: REPORTING & DASHBOARD - DATABASE SETUP

-- 1. Dashboard summary stats function
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
    (SELECT COUNT(*) FROM th_test_cases)::BIGINT,
    (SELECT COUNT(*) FROM th_test_cycles)::BIGINT,
    (SELECT COUNT(*) FROM th_test_cycles WHERE status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM th_test_cycles WHERE status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status != 'not_run')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'passed')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'failed')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'blocked')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'skipped')::BIGINT,
    (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'not_run')::BIGINT,
    COALESCE(
      ROUND(
        (SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status = 'passed')::NUMERIC * 100 /
        NULLIF((SELECT COUNT(*) FROM th_cycle_test_cases WHERE execution_status != 'not_run'), 0),
        1
      ),
      0
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Cycle pass rates for trend chart
CREATE OR REPLACE FUNCTION get_cycle_pass_rates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  cycle_id UUID,
  cycle_key TEXT,
  cycle_name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  total_cases BIGINT,
  executed BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cycle_key,
    c.name,
    c.status,
    c.created_at,
    c.total_cases::BIGINT,
    (c.total_cases - c.not_run_count)::BIGINT,
    CASE 
      WHEN (c.total_cases - c.not_run_count) > 0 
      THEN ROUND(c.passed_count::NUMERIC * 100 / (c.total_cases - c.not_run_count), 1)
      ELSE 0
    END
  FROM th_test_cycles c
  WHERE c.total_cases > 0
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Top failing tests
CREATE OR REPLACE FUNCTION get_top_failing_tests(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  failure_count BIGINT,
  last_failed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.case_key,
    tc.title,
    tc.priority,
    COUNT(*)::BIGINT,
    MAX(ctc.executed_at)
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON tc.id = ctc.test_case_id
  WHERE ctc.execution_status = 'failed'
  GROUP BY tc.id, tc.case_key, tc.title, tc.priority
  ORDER BY COUNT(*) DESC, MAX(ctc.executed_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Cycle stats by tester
CREATE OR REPLACE FUNCTION get_cycle_stats_by_tester(p_cycle_id UUID)
RETURNS TABLE (
  tester_id UUID,
  tester_name TEXT,
  total_assigned BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  skipped BIGINT,
  not_run BIGINT,
  executed BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, 'Unassigned'),
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'failed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'blocked')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'skipped')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'not_run')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run')::BIGINT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run') > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::NUMERIC * 100 /
        COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run'),
        1
      )
      ELSE 0
    END
  FROM th_cycle_test_cases ctc
  LEFT JOIN profiles p ON p.id = ctc.assigned_to
  WHERE ctc.cycle_id = p_cycle_id
  GROUP BY p.id, p.full_name
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Cycle stats by priority
CREATE OR REPLACE FUNCTION get_cycle_stats_by_priority(p_cycle_id UUID)
RETURNS TABLE (
  priority TEXT,
  total BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  skipped BIGINT,
  not_run BIGINT,
  executed BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(tc.priority, 'medium'),
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'failed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'blocked')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'skipped')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'not_run')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run')::BIGINT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run') > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::NUMERIC * 100 /
        COUNT(*) FILTER (WHERE ctc.execution_status != 'not_run'),
        1
      )
      ELSE 0
    END
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON tc.id = ctc.test_case_id
  WHERE ctc.cycle_id = p_cycle_id
  GROUP BY tc.priority
  ORDER BY 
    CASE COALESCE(tc.priority, 'medium')
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql;

-- 6. Cycle failure reasons
CREATE OR REPLACE FUNCTION get_cycle_failure_reasons(p_cycle_id UUID)
RETURNS TABLE (
  failure_reason TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ctc.failure_reason, 'unspecified'),
    COUNT(*)::BIGINT
  FROM th_cycle_test_cases ctc
  WHERE ctc.cycle_id = p_cycle_id
    AND ctc.execution_status = 'failed'
  GROUP BY ctc.failure_reason
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Daily execution counts for timeline chart
CREATE OR REPLACE FUNCTION get_cycle_daily_executions(p_cycle_id UUID)
RETURNS TABLE (
  execution_date DATE,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  skipped BIGINT,
  total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ctc.executed_at),
    COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'failed')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'blocked')::BIGINT,
    COUNT(*) FILTER (WHERE ctc.execution_status = 'skipped')::BIGINT,
    COUNT(*)::BIGINT
  FROM th_cycle_test_cases ctc
  WHERE ctc.cycle_id = p_cycle_id
    AND ctc.executed_at IS NOT NULL
  GROUP BY DATE(ctc.executed_at)
  ORDER BY DATE(ctc.executed_at) ASC;
END;
$$ LANGUAGE plpgsql;
