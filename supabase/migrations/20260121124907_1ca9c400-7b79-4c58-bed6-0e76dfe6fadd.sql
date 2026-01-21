
-- =====================================================
-- MODULE 4A-5: RELEASE INTEGRATION
-- Connects test cycles to releases with quality gates
-- =====================================================

-- 1. Quality gate definitions for releases
CREATE TABLE IF NOT EXISTS tm_release_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  gate_name TEXT NOT NULL,
  gate_type TEXT NOT NULL CHECK (gate_type IN ('pass_rate', 'execution_rate', 'defect_count', 'blocker_count', 'coverage', 'custom')),
  threshold_operator TEXT NOT NULL CHECK (threshold_operator IN ('>=', '<=', '=', '>', '<')),
  threshold_value NUMERIC NOT NULL,
  is_blocking BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(release_id, gate_name)
);

-- 2. Quality gate evaluation results
CREATE TABLE IF NOT EXISTS tm_release_gate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES tm_release_quality_gates(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES tm_test_cycles(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  actual_value NUMERIC,
  passed BOOLEAN NOT NULL,
  notes TEXT,
  evaluated_by UUID REFERENCES profiles(id)
);

-- 3. Release readiness snapshots
CREATE TABLE IF NOT EXISTS tm_release_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('not_ready', 'at_risk', 'ready', 'approved')),
  gates_passed INTEGER DEFAULT 0,
  gates_total INTEGER DEFAULT 0,
  blocking_gates_passed INTEGER DEFAULT 0,
  blocking_gates_total INTEGER DEFAULT 0,
  test_execution_pct NUMERIC DEFAULT 0,
  test_pass_pct NUMERIC DEFAULT 0,
  open_blockers INTEGER DEFAULT 0,
  open_criticals INTEGER DEFAULT 0,
  recommendation TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ
);

-- 4. Enable RLS
ALTER TABLE tm_release_quality_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_release_gate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_release_readiness ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read quality gates"
  ON tm_release_quality_gates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage quality gates"
  ON tm_release_quality_gates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read gate results"
  ON tm_release_gate_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage gate results"
  ON tm_release_gate_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read readiness"
  ON tm_release_readiness FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage readiness"
  ON tm_release_readiness FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. RPC: Get release test summary (aggregated from all linked cycles)
CREATE OR REPLACE FUNCTION tm_get_release_test_summary(p_release_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'release_id', p_release_id,
    'cycles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'cycle_id', c.id,
        'cycle_name', c.name,
        'status', c.status,
        'total_cases', COALESCE(stats.total, 0),
        'passed', COALESCE(stats.passed, 0),
        'failed', COALESCE(stats.failed, 0),
        'blocked', COALESCE(stats.blocked, 0),
        'not_run', COALESCE(stats.not_run, 0),
        'execution_pct', CASE WHEN COALESCE(stats.total, 0) > 0 
          THEN ROUND(((COALESCE(stats.total, 0) - COALESCE(stats.not_run, 0))::NUMERIC / stats.total) * 100, 1)
          ELSE 0 END,
        'pass_pct', CASE WHEN COALESCE(stats.total, 0) - COALESCE(stats.not_run, 0) > 0
          THEN ROUND((COALESCE(stats.passed, 0)::NUMERIC / (stats.total - stats.not_run)) * 100, 1)
          ELSE 0 END
      ) ORDER BY c.start_date)
      FROM tm_test_cycles c
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'passed') as passed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
          COUNT(*) FILTER (WHERE status = 'not_run') as not_run
        FROM tm_cycle_scope WHERE cycle_id = c.id
      ) stats ON true
      WHERE c.release_id = p_release_id
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'total_cases', COALESCE(SUM(total), 0),
        'passed', COALESCE(SUM(passed), 0),
        'failed', COALESCE(SUM(failed), 0),
        'blocked', COALESCE(SUM(blocked), 0),
        'not_run', COALESCE(SUM(not_run), 0),
        'execution_pct', CASE WHEN COALESCE(SUM(total), 0) > 0
          THEN ROUND(((SUM(total) - SUM(not_run))::NUMERIC / SUM(total)) * 100, 1)
          ELSE 0 END,
        'pass_pct', CASE WHEN COALESCE(SUM(total), 0) - COALESCE(SUM(not_run), 0) > 0
          THEN ROUND((SUM(passed)::NUMERIC / (SUM(total) - SUM(not_run))) * 100, 1)
          ELSE 0 END
      )
      FROM (
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE cs.status = 'passed') as passed,
          COUNT(*) FILTER (WHERE cs.status = 'failed') as failed,
          COUNT(*) FILTER (WHERE cs.status = 'blocked') as blocked,
          COUNT(*) FILTER (WHERE cs.status = 'not_run') as not_run
        FROM tm_test_cycles c
        JOIN tm_cycle_scope cs ON cs.cycle_id = c.id
        WHERE c.release_id = p_release_id
      ) agg
    ),
    'defects', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'open', COUNT(*) FILTER (WHERE d.status NOT IN ('closed', 'resolved', 'verified')),
        'blockers', COUNT(*) FILTER (WHERE d.severity = 'blocker' AND d.status NOT IN ('closed', 'resolved', 'verified')),
        'criticals', COUNT(*) FILTER (WHERE d.severity = 'critical' AND d.status NOT IN ('closed', 'resolved', 'verified'))
      )
      FROM tm_test_cycles c
      JOIN tm_cycle_scope cs ON cs.cycle_id = c.id
      JOIN defects d ON d.test_case_id = cs.test_case_id
      WHERE c.release_id = p_release_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 6. RPC: Evaluate quality gates for a release
CREATE OR REPLACE FUNCTION tm_evaluate_release_gates(p_release_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gate RECORD;
  v_actual NUMERIC;
  v_passed BOOLEAN;
  v_results JSONB := '[]'::jsonb;
  v_summary JSONB;
  v_test_summary JSONB;
BEGIN
  -- Get test summary first
  v_test_summary := tm_get_release_test_summary(p_release_id);
  
  -- Evaluate each gate
  FOR v_gate IN 
    SELECT * FROM tm_release_quality_gates 
    WHERE release_id = p_release_id 
    ORDER BY sort_order
  LOOP
    -- Calculate actual value based on gate type
    CASE v_gate.gate_type
      WHEN 'pass_rate' THEN
        v_actual := (v_test_summary->'totals'->>'pass_pct')::NUMERIC;
      WHEN 'execution_rate' THEN
        v_actual := (v_test_summary->'totals'->>'execution_pct')::NUMERIC;
      WHEN 'defect_count' THEN
        v_actual := (v_test_summary->'defects'->>'open')::NUMERIC;
      WHEN 'blocker_count' THEN
        v_actual := (v_test_summary->'defects'->>'blockers')::NUMERIC;
      WHEN 'coverage' THEN
        v_actual := (v_test_summary->'totals'->>'total_cases')::NUMERIC;
      ELSE
        v_actual := 0;
    END CASE;
    
    -- Evaluate threshold
    CASE v_gate.threshold_operator
      WHEN '>=' THEN v_passed := v_actual >= v_gate.threshold_value;
      WHEN '<=' THEN v_passed := v_actual <= v_gate.threshold_value;
      WHEN '>' THEN v_passed := v_actual > v_gate.threshold_value;
      WHEN '<' THEN v_passed := v_actual < v_gate.threshold_value;
      WHEN '=' THEN v_passed := v_actual = v_gate.threshold_value;
      ELSE v_passed := false;
    END CASE;
    
    -- Insert result
    INSERT INTO tm_release_gate_results (release_id, gate_id, actual_value, passed, evaluated_by)
    VALUES (p_release_id, v_gate.id, v_actual, v_passed, p_user_id);
    
    -- Add to results array
    v_results := v_results || jsonb_build_object(
      'gate_id', v_gate.id,
      'gate_name', v_gate.gate_name,
      'gate_type', v_gate.gate_type,
      'threshold', v_gate.threshold_operator || ' ' || v_gate.threshold_value,
      'actual_value', v_actual,
      'passed', v_passed,
      'is_blocking', v_gate.is_blocking
    );
  END LOOP;
  
  -- Build summary
  SELECT jsonb_build_object(
    'release_id', p_release_id,
    'evaluated_at', now(),
    'gates', v_results,
    'summary', jsonb_build_object(
      'total_gates', jsonb_array_length(v_results),
      'passed_gates', (SELECT COUNT(*) FROM jsonb_array_elements(v_results) g WHERE (g->>'passed')::boolean),
      'blocking_passed', (SELECT COUNT(*) FROM jsonb_array_elements(v_results) g WHERE (g->>'passed')::boolean AND (g->>'is_blocking')::boolean),
      'blocking_total', (SELECT COUNT(*) FROM jsonb_array_elements(v_results) g WHERE (g->>'is_blocking')::boolean),
      'all_blocking_passed', NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_results) g 
        WHERE (g->>'is_blocking')::boolean AND NOT (g->>'passed')::boolean
      )
    ),
    'test_summary', v_test_summary
  ) INTO v_summary;
  
  RETURN v_summary;
END;
$$;

-- 7. RPC: Create readiness snapshot
CREATE OR REPLACE FUNCTION tm_create_readiness_snapshot(
  p_release_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_recommendation TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_evaluation JSONB;
  v_status TEXT;
  v_snapshot_id UUID;
BEGIN
  -- Evaluate gates
  v_evaluation := tm_evaluate_release_gates(p_release_id, p_user_id);
  
  -- Determine status
  IF (v_evaluation->'summary'->>'all_blocking_passed')::boolean THEN
    IF (v_evaluation->'summary'->>'passed_gates')::int = (v_evaluation->'summary'->>'total_gates')::int THEN
      v_status := 'ready';
    ELSE
      v_status := 'at_risk';
    END IF;
  ELSE
    v_status := 'not_ready';
  END IF;
  
  -- Create snapshot
  INSERT INTO tm_release_readiness (
    release_id,
    overall_status,
    gates_passed,
    gates_total,
    blocking_gates_passed,
    blocking_gates_total,
    test_execution_pct,
    test_pass_pct,
    open_blockers,
    open_criticals,
    recommendation,
    created_by
  ) VALUES (
    p_release_id,
    v_status,
    (v_evaluation->'summary'->>'passed_gates')::int,
    (v_evaluation->'summary'->>'total_gates')::int,
    (v_evaluation->'summary'->>'blocking_passed')::int,
    (v_evaluation->'summary'->>'blocking_total')::int,
    (v_evaluation->'test_summary'->'totals'->>'execution_pct')::numeric,
    (v_evaluation->'test_summary'->'totals'->>'pass_pct')::numeric,
    (v_evaluation->'test_summary'->'defects'->>'blockers')::int,
    (v_evaluation->'test_summary'->'defects'->>'criticals')::int,
    p_recommendation,
    p_user_id
  ) RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- 8. RPC: Approve release readiness
CREATE OR REPLACE FUNCTION tm_approve_release_readiness(
  p_snapshot_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tm_release_readiness
  SET 
    overall_status = 'approved',
    approved_by = p_user_id,
    approved_at = now()
  WHERE id = p_snapshot_id;
  
  RETURN FOUND;
END;
$$;

-- 9. RPC: Get release readiness history
CREATE OR REPLACE FUNCTION tm_get_release_readiness_history(p_release_id UUID)
RETURNS TABLE (
  id UUID,
  snapshot_at TIMESTAMPTZ,
  overall_status TEXT,
  gates_passed INTEGER,
  gates_total INTEGER,
  blocking_gates_passed INTEGER,
  blocking_gates_total INTEGER,
  test_execution_pct NUMERIC,
  test_pass_pct NUMERIC,
  open_blockers INTEGER,
  open_criticals INTEGER,
  recommendation TEXT,
  created_by_name TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.snapshot_at,
    r.overall_status,
    r.gates_passed,
    r.gates_total,
    r.blocking_gates_passed,
    r.blocking_gates_total,
    r.test_execution_pct,
    r.test_pass_pct,
    r.open_blockers,
    r.open_criticals,
    r.recommendation,
    pc.full_name as created_by_name,
    pa.full_name as approved_by_name,
    r.approved_at
  FROM tm_release_readiness r
  LEFT JOIN profiles pc ON pc.id = r.created_by
  LEFT JOIN profiles pa ON pa.id = r.approved_by
  WHERE r.release_id = p_release_id
  ORDER BY r.snapshot_at DESC;
END;
$$;

-- 10. Add release_id to test cycles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tm_test_cycles' AND column_name = 'release_id'
  ) THEN
    ALTER TABLE tm_test_cycles ADD COLUMN release_id UUID REFERENCES releases(id) ON DELETE SET NULL;
    CREATE INDEX idx_tm_test_cycles_release ON tm_test_cycles(release_id);
  END IF;
END $$;
