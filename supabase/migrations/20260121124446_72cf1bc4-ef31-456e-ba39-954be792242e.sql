-- ============================================================
-- MODULE 4A-4: PLAN/CYCLE ANALYTICS
-- Metrics dashboard, cycle comparison, quality trends, velocity charts
-- ============================================================

-- ============================================================
-- RPC: Get cycle quality metrics over time
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_quality_trends(p_cycle_id UUID, p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  date_key DATE,
  date_label TEXT,
  pass_rate NUMERIC,
  execution_rate NUMERIC,
  defect_rate NUMERIC,
  cumulative_passed BIGINT,
  cumulative_failed BIGINT,
  cumulative_blocked BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - p_days;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as d
  ),
  daily_stats AS (
    SELECT 
      tr.completed_at::DATE as run_date,
      COUNT(*) FILTER (WHERE tr.status = 'passed') as passed,
      COUNT(*) FILTER (WHERE tr.status = 'failed') as failed,
      COUNT(*) FILTER (WHERE tr.status = 'blocked') as blocked,
      COUNT(*) as total_executed
    FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    WHERE cs.cycle_id = p_cycle_id
      AND tr.completed_at IS NOT NULL
      AND tr.completed_at::DATE >= v_start_date
    GROUP BY tr.completed_at::DATE
  ),
  scope_total AS (
    SELECT COUNT(*)::NUMERIC as total FROM tm_cycle_scope WHERE cycle_id = p_cycle_id
  )
  SELECT 
    ds.d as date_key,
    TO_CHAR(ds.d, 'Mon DD')::TEXT as date_label,
    CASE 
      WHEN COALESCE(dc.total_executed, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(dc.passed, 0)::NUMERIC / dc.total_executed * 100, 1)
    END as pass_rate,
    CASE 
      WHEN st.total = 0 THEN 0
      ELSE ROUND(SUM(COALESCE(dc.total_executed, 0)) OVER (ORDER BY ds.d)::NUMERIC / st.total * 100, 1)
    END as execution_rate,
    CASE 
      WHEN COALESCE(dc.total_executed, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(dc.failed, 0)::NUMERIC / dc.total_executed * 100, 1)
    END as defect_rate,
    SUM(COALESCE(dc.passed, 0)) OVER (ORDER BY ds.d)::BIGINT as cumulative_passed,
    SUM(COALESCE(dc.failed, 0)) OVER (ORDER BY ds.d)::BIGINT as cumulative_failed,
    SUM(COALESCE(dc.blocked, 0)) OVER (ORDER BY ds.d)::BIGINT as cumulative_blocked
  FROM date_series ds
  LEFT JOIN daily_stats dc ON ds.d = dc.run_date
  CROSS JOIN scope_total st
  ORDER BY ds.d;
END;
$$;

-- ============================================================
-- RPC: Compare multiple cycles side by side
-- ============================================================
CREATE OR REPLACE FUNCTION tm_compare_cycles(p_cycle_ids UUID[])
RETURNS TABLE (
  cycle_id UUID,
  cycle_name TEXT,
  cycle_key TEXT,
  status TEXT,
  start_date DATE,
  end_date DATE,
  total_cases BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  not_run BIGINT,
  execution_rate NUMERIC,
  pass_rate NUMERIC,
  defect_density NUMERIC,
  avg_execution_time NUMERIC,
  active_testers BIGINT,
  total_defects BIGINT,
  health_score NUMERIC,
  health_level TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cycle_id,
    c.name::TEXT as cycle_name,
    c.cycle_key::TEXT as cycle_key,
    c.status::TEXT,
    c.planned_start as start_date,
    c.planned_end as end_date,
    COALESCE(c.total_cases, 0)::BIGINT as total_cases,
    COALESCE(c.passed_count, 0)::BIGINT as passed,
    COALESCE(c.failed_count, 0)::BIGINT as failed,
    COALESCE(c.blocked_count, 0)::BIGINT as blocked,
    COALESCE(c.not_run_count, 0)::BIGINT as not_run,
    CASE 
      WHEN COALESCE(c.total_cases, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(c.passed_count, 0) + COALESCE(c.failed_count, 0) + COALESCE(c.blocked_count, 0))::NUMERIC / c.total_cases * 100, 1)
    END as execution_rate,
    CASE 
      WHEN (COALESCE(c.passed_count, 0) + COALESCE(c.failed_count, 0) + COALESCE(c.blocked_count, 0)) = 0 THEN 0
      ELSE ROUND(COALESCE(c.passed_count, 0)::NUMERIC / (c.passed_count + c.failed_count + c.blocked_count) * 100, 1)
    END as pass_rate,
    CASE 
      WHEN COALESCE(c.total_cases, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(c.failed_count, 0)::NUMERIC / c.total_cases * 100, 2)
    END as defect_density,
    COALESCE((
      SELECT AVG(tr.duration_seconds)::NUMERIC
      FROM tm_test_runs tr
      JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
      WHERE cs.cycle_id = c.id AND tr.duration_seconds IS NOT NULL
    ), 0) as avg_execution_time,
    COALESCE((
      SELECT COUNT(DISTINCT cs.assigned_to)::BIGINT
      FROM tm_cycle_scope cs
      WHERE cs.cycle_id = c.id AND cs.assigned_to IS NOT NULL
    ), 0) as active_testers,
    COALESCE((
      SELECT SUM(tr.defects_found)::BIGINT
      FROM tm_test_runs tr
      JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
      WHERE cs.cycle_id = c.id
    ), 0) as total_defects,
    -- Health score calculation (0-100)
    CASE 
      WHEN COALESCE(c.total_cases, 0) = 0 THEN 0
      ELSE ROUND(
        (COALESCE(c.passed_count, 0)::NUMERIC / c.total_cases * 50) + -- Pass contribution (50%)
        ((COALESCE(c.total_cases, 0) - COALESCE(c.failed_count, 0) - COALESCE(c.blocked_count, 0))::NUMERIC / c.total_cases * 30) + -- No failures contribution (30%)
        ((COALESCE(c.passed_count, 0) + COALESCE(c.failed_count, 0) + COALESCE(c.blocked_count, 0))::NUMERIC / c.total_cases * 20) -- Execution progress (20%)
      , 1)
    END as health_score,
    CASE 
      WHEN COALESCE(c.total_cases, 0) = 0 THEN 'unknown'
      WHEN (COALESCE(c.passed_count, 0)::NUMERIC / NULLIF(c.passed_count + c.failed_count + c.blocked_count, 0)) >= 0.9 THEN 'excellent'
      WHEN (COALESCE(c.passed_count, 0)::NUMERIC / NULLIF(c.passed_count + c.failed_count + c.blocked_count, 0)) >= 0.7 THEN 'good'
      WHEN (COALESCE(c.passed_count, 0)::NUMERIC / NULLIF(c.passed_count + c.failed_count + c.blocked_count, 0)) >= 0.5 THEN 'fair'
      ELSE 'poor'
    END::TEXT as health_level
  FROM tm_test_cycles c
  WHERE c.id = ANY(p_cycle_ids)
  ORDER BY c.planned_start DESC NULLS LAST;
END;
$$;

-- ============================================================
-- RPC: Get defect trends by severity for a cycle
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_defect_trends(p_cycle_id UUID, p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  date_key DATE,
  date_label TEXT,
  blocker_count BIGINT,
  critical_count BIGINT,
  major_count BIGINT,
  minor_count BIGINT,
  total_defects BIGINT,
  cumulative_total BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - p_days;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as d
  ),
  defect_counts AS (
    -- From tm_test_runs that recorded defects
    SELECT 
      tr.completed_at::DATE as defect_date,
      COUNT(*) FILTER (WHERE tr.status = 'failed') as total_failures
    FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    WHERE cs.cycle_id = p_cycle_id
      AND tr.completed_at IS NOT NULL
      AND tr.completed_at::DATE >= v_start_date
      AND tr.status = 'failed'
    GROUP BY tr.completed_at::DATE
  )
  SELECT 
    ds.d as date_key,
    TO_CHAR(ds.d, 'Mon DD')::TEXT as date_label,
    -- Distribute defects by severity (simulated - would be from actual defect table)
    ROUND(COALESCE(dc.total_failures, 0) * 0.1)::BIGINT as blocker_count,
    ROUND(COALESCE(dc.total_failures, 0) * 0.2)::BIGINT as critical_count,
    ROUND(COALESCE(dc.total_failures, 0) * 0.4)::BIGINT as major_count,
    ROUND(COALESCE(dc.total_failures, 0) * 0.3)::BIGINT as minor_count,
    COALESCE(dc.total_failures, 0)::BIGINT as total_defects,
    SUM(COALESCE(dc.total_failures, 0)) OVER (ORDER BY ds.d)::BIGINT as cumulative_total
  FROM date_series ds
  LEFT JOIN defect_counts dc ON ds.d = dc.defect_date
  ORDER BY ds.d;
END;
$$;

-- ============================================================
-- RPC: Get tester performance metrics for a cycle
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_tester_performance(p_cycle_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_initials TEXT,
  tests_assigned BIGINT,
  tests_completed BIGINT,
  tests_passed BIGINT,
  tests_failed BIGINT,
  completion_rate NUMERIC,
  pass_rate NUMERIC,
  avg_execution_time NUMERIC,
  defects_found BIGINT,
  productivity_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.full_name, p.email, 'Unknown')::TEXT as user_name,
    UPPER(SUBSTRING(COALESCE(p.full_name, 'U') FROM 1 FOR 1) || 
          COALESCE(SUBSTRING(COALESCE(p.full_name, '') FROM POSITION(' ' IN COALESCE(p.full_name, '') || ' ') + 1 FOR 1), ''))::TEXT as user_initials,
    COUNT(cs.id)::BIGINT as tests_assigned,
    COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked', 'skipped'))::BIGINT as tests_completed,
    COUNT(*) FILTER (WHERE cs.status = 'passed')::BIGINT as tests_passed,
    COUNT(*) FILTER (WHERE cs.status = 'failed')::BIGINT as tests_failed,
    CASE 
      WHEN COUNT(cs.id) = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked', 'skipped'))::NUMERIC / COUNT(cs.id) * 100, 1)
    END as completion_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked')) = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE cs.status = 'passed')::NUMERIC / COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked')) * 100, 1)
    END as pass_rate,
    COALESCE((
      SELECT AVG(tr.duration_seconds)::NUMERIC
      FROM tm_test_runs tr
      WHERE tr.cycle_scope_id = ANY(ARRAY_AGG(cs.id)) AND tr.duration_seconds IS NOT NULL
    ), 0) as avg_execution_time,
    COALESCE((
      SELECT SUM(tr.defects_found)::BIGINT
      FROM tm_test_runs tr
      WHERE tr.cycle_scope_id = ANY(ARRAY_AGG(cs.id))
    ), 0) as defects_found,
    -- Productivity score: weighted combination of completion rate, pass rate, and defect finding
    CASE 
      WHEN COUNT(cs.id) = 0 THEN 0
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked', 'skipped'))::NUMERIC / COUNT(cs.id) * 40) + -- Completion (40%)
        (COUNT(*) FILTER (WHERE cs.status = 'passed')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked')), 0) * 40) + -- Pass rate (40%)
        LEAST(COUNT(*) FILTER (WHERE cs.status = 'failed')::NUMERIC * 2, 20) -- Defect finding bonus (up to 20%)
      , 1)
    END as productivity_score
  FROM tm_cycle_scope cs
  JOIN profiles p ON cs.assigned_to = p.id
  WHERE cs.cycle_id = p_cycle_id AND cs.assigned_to IS NOT NULL
  GROUP BY p.id, p.full_name, p.email
  ORDER BY productivity_score DESC NULLS LAST;
END;
$$;

-- ============================================================
-- RPC: Get plan-level aggregated metrics
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_plan_analytics(p_plan_id UUID)
RETURNS TABLE (
  plan_id UUID,
  plan_name TEXT,
  total_cycles BIGINT,
  active_cycles BIGINT,
  completed_cycles BIGINT,
  total_test_cases BIGINT,
  total_passed BIGINT,
  total_failed BIGINT,
  total_blocked BIGINT,
  overall_pass_rate NUMERIC,
  overall_execution_rate NUMERIC,
  avg_cycle_duration_days NUMERIC,
  total_defects_found BIGINT,
  plan_health_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id as plan_id,
    tp.name::TEXT as plan_name,
    COUNT(DISTINCT c.id)::BIGINT as total_cycles,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'in_progress')::BIGINT as active_cycles,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed')::BIGINT as completed_cycles,
    COALESCE(SUM(c.total_cases), 0)::BIGINT as total_test_cases,
    COALESCE(SUM(c.passed_count), 0)::BIGINT as total_passed,
    COALESCE(SUM(c.failed_count), 0)::BIGINT as total_failed,
    COALESCE(SUM(c.blocked_count), 0)::BIGINT as total_blocked,
    CASE 
      WHEN COALESCE(SUM(c.passed_count), 0) + COALESCE(SUM(c.failed_count), 0) + COALESCE(SUM(c.blocked_count), 0) = 0 THEN 0
      ELSE ROUND(SUM(c.passed_count)::NUMERIC / (SUM(c.passed_count) + SUM(c.failed_count) + SUM(c.blocked_count)) * 100, 1)
    END as overall_pass_rate,
    CASE 
      WHEN COALESCE(SUM(c.total_cases), 0) = 0 THEN 0
      ELSE ROUND((SUM(c.passed_count) + SUM(c.failed_count) + SUM(c.blocked_count))::NUMERIC / SUM(c.total_cases) * 100, 1)
    END as overall_execution_rate,
    COALESCE(AVG(
      CASE WHEN c.planned_start IS NOT NULL AND c.planned_end IS NOT NULL 
           THEN (c.planned_end - c.planned_start)::NUMERIC 
           ELSE NULL END
    ), 0) as avg_cycle_duration_days,
    COALESCE((
      SELECT SUM(tr.defects_found)::BIGINT
      FROM tm_test_runs tr
      JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
      JOIN tm_test_cycles cyc ON cs.cycle_id = cyc.id
      WHERE cyc.plan_id = tp.id
    ), 0) as total_defects_found,
    -- Plan health score
    CASE 
      WHEN COALESCE(SUM(c.total_cases), 0) = 0 THEN 0
      ELSE ROUND(
        (SUM(c.passed_count)::NUMERIC / NULLIF(SUM(c.passed_count) + SUM(c.failed_count) + SUM(c.blocked_count), 0) * 60) + -- Pass rate weight
        (COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed')::NUMERIC / NULLIF(COUNT(DISTINCT c.id), 0) * 40) -- Completion weight
      , 1)
    END as plan_health_score
  FROM tm_test_plans tp
  LEFT JOIN tm_test_cycles c ON c.plan_id = tp.id
  WHERE tp.id = p_plan_id
  GROUP BY tp.id, tp.name;
END;
$$;