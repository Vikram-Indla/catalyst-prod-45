-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5B-1: RELEASE QUALITY METRICS
-- Real-time metrics calculation for release readiness
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Get comprehensive release quality metrics
CREATE OR REPLACE FUNCTION get_release_quality_metrics(p_release_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
  v_test_total INTEGER := 0;
  v_test_passed INTEGER := 0;
  v_test_failed INTEGER := 0;
  v_test_blocked INTEGER := 0;
  v_test_not_run INTEGER := 0;
  v_defects_open INTEGER := 0;
  v_defects_closed INTEGER := 0;
  v_defects_blocker INTEGER := 0;
  v_defects_critical INTEGER := 0;
  v_coverage_percent NUMERIC := 0;
  v_automation_rate NUMERIC := 0;
  v_pass_rate NUMERIC := 0;
BEGIN
  -- Get test execution counts from test_executions linked to release
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'passed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'blocked'),
    COUNT(*) FILTER (WHERE status IN ('not_run', 'pending', 'skipped'))
  INTO v_test_total, v_test_passed, v_test_failed, v_test_blocked, v_test_not_run
  FROM test_executions te
  JOIN test_runs tr ON tr.id = te.run_id
  JOIN test_cycles tc ON tc.id = tr.cycle_id
  WHERE tc.release_id = p_release_id;

  -- If no executions, count test cases assigned to release
  IF v_test_total = 0 THEN
    SELECT COUNT(*) INTO v_test_total
    FROM test_cases WHERE release_id = p_release_id;
    v_test_not_run := v_test_total;
  END IF;

  -- Calculate pass rate
  IF (v_test_passed + v_test_failed) > 0 THEN
    v_pass_rate := ROUND((v_test_passed::NUMERIC / (v_test_passed + v_test_failed)) * 100, 1);
  END IF;

  -- Calculate coverage (executed / total)
  IF v_test_total > 0 THEN
    v_coverage_percent := ROUND(((v_test_total - v_test_not_run)::NUMERIC / v_test_total) * 100, 1);
  END IF;

  -- Get defect counts from defects table linked to release
  SELECT 
    COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved', 'rejected')),
    COUNT(*) FILTER (WHERE status IN ('closed', 'resolved')),
    COUNT(*) FILTER (WHERE severity = 'blocker' AND status NOT IN ('closed', 'resolved', 'rejected')),
    COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'resolved', 'rejected'))
  INTO v_defects_open, v_defects_closed, v_defects_blocker, v_defects_critical
  FROM defects WHERE release_id = p_release_id;

  -- Get automation rate from test_cases
  SELECT 
    CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE automation_status = 'automated')::NUMERIC / COUNT(*)) * 100, 1)
      ELSE 0 
    END
  INTO v_automation_rate
  FROM test_cases WHERE release_id = p_release_id;

  -- Build metrics object
  v_metrics := jsonb_build_object(
    'success', true,
    'release_id', p_release_id,
    'test_execution', jsonb_build_object(
      'total', v_test_total,
      'passed', v_test_passed,
      'failed', v_test_failed,
      'blocked', v_test_blocked,
      'not_run', v_test_not_run,
      'pass_rate', v_pass_rate,
      'coverage_percent', v_coverage_percent
    ),
    'defects', jsonb_build_object(
      'open', v_defects_open,
      'closed', v_defects_closed,
      'blocker', v_defects_blocker,
      'critical', v_defects_critical,
      'total', v_defects_open + v_defects_closed
    ),
    'automation', jsonb_build_object(
      'rate', v_automation_rate,
      'automated_count', (SELECT COUNT(*) FROM test_cases WHERE release_id = p_release_id AND automation_status = 'automated'),
      'manual_count', (SELECT COUNT(*) FROM test_cases WHERE release_id = p_release_id AND (automation_status IS NULL OR automation_status = 'manual'))
    ),
    'calculated_at', now()
  );

  RETURN v_metrics;
END;
$$;

-- Function: Get release health score with breakdown
CREATE OR REPLACE FUNCTION calculate_release_health(p_release_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
  v_pass_rate NUMERIC;
  v_coverage NUMERIC;
  v_defect_score NUMERIC;
  v_automation_score NUMERIC;
  v_health_score NUMERIC;
  v_health_level TEXT;
BEGIN
  -- Get metrics first
  v_metrics := get_release_quality_metrics(p_release_id);
  
  -- Extract values
  v_pass_rate := COALESCE((v_metrics->'test_execution'->>'pass_rate')::NUMERIC, 0);
  v_coverage := COALESCE((v_metrics->'test_execution'->>'coverage_percent')::NUMERIC, 0);
  v_automation_score := COALESCE((v_metrics->'automation'->>'rate')::NUMERIC, 0);
  
  -- Calculate defect score (100 - penalty for open defects)
  v_defect_score := GREATEST(0, 100 - 
    (COALESCE((v_metrics->'defects'->>'blocker')::INTEGER, 0) * 25) -
    (COALESCE((v_metrics->'defects'->>'critical')::INTEGER, 0) * 15) -
    (COALESCE((v_metrics->'defects'->>'open')::INTEGER, 0) * 5)
  );

  -- Calculate weighted health score
  -- Pass Rate: 40%, Coverage: 25%, Defects: 25%, Automation: 10%
  v_health_score := ROUND(
    (v_pass_rate * 0.40) +
    (v_coverage * 0.25) +
    (v_defect_score * 0.25) +
    (v_automation_score * 0.10)
  , 1);

  -- Determine health level
  v_health_level := CASE
    WHEN v_health_score >= 85 THEN 'healthy'
    WHEN v_health_score >= 70 THEN 'attention'
    WHEN v_health_score >= 50 THEN 'at_risk'
    ELSE 'critical'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'release_id', p_release_id,
    'score', v_health_score,
    'level', v_health_level,
    'breakdown', jsonb_build_object(
      'pass_rate', jsonb_build_object('value', v_pass_rate, 'weight', 40),
      'coverage', jsonb_build_object('value', v_coverage, 'weight', 25),
      'defects', jsonb_build_object('value', v_defect_score, 'weight', 25),
      'automation', jsonb_build_object('value', v_automation_score, 'weight', 10)
    ),
    'metrics', v_metrics,
    'calculated_at', now()
  );
END;
$$;

-- Function: Get execution trend over time
CREATE OR REPLACE FUNCTION get_release_execution_trend(
  p_release_id UUID,
  p_days INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'trend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', day::DATE,
        'passed', passed,
        'failed', failed,
        'blocked', blocked
      ) ORDER BY day)
      FROM (
        SELECT 
          DATE_TRUNC('day', te.executed_at) AS day,
          COUNT(*) FILTER (WHERE te.status = 'passed') AS passed,
          COUNT(*) FILTER (WHERE te.status = 'failed') AS failed,
          COUNT(*) FILTER (WHERE te.status = 'blocked') AS blocked
        FROM test_executions te
        JOIN test_runs tr ON tr.id = te.run_id
        JOIN test_cycles tc ON tc.id = tr.cycle_id
        WHERE tc.release_id = p_release_id
          AND te.executed_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('day', te.executed_at)
      ) daily
    ), '[]'::JSONB)
  );
END;
$$;