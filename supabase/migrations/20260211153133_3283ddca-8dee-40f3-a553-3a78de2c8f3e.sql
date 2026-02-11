
-- =====================================================
-- G17: QUALITY GATES - Full Database Setup
-- =====================================================

-- 1. Add missing columns to tm_release_quality_gates
ALTER TABLE public.tm_release_quality_gates 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waived_by UUID,
  ADD COLUMN IF NOT EXISTS waiver_reason TEXT,
  ADD COLUMN IF NOT EXISTS waiver_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tm_gates_status ON public.tm_release_quality_gates(status);

-- 2. Gate evaluation history table
CREATE TABLE IF NOT EXISTS public.tm_gate_evaluation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id UUID NOT NULL REFERENCES public.tm_release_quality_gates(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  evaluation_type TEXT NOT NULL DEFAULT 'automatic',
  evaluated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_eval_history_gate ON public.tm_gate_evaluation_history(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_eval_history_created ON public.tm_gate_evaluation_history(created_at DESC);

ALTER TABLE public.tm_gate_evaluation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gate evaluation history"
  ON public.tm_gate_evaluation_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert gate evaluation history"
  ON public.tm_gate_evaluation_history FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Gate templates table
CREATE TABLE IF NOT EXISTS public.tm_gate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  gate_type TEXT NOT NULL,
  threshold_operator TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  is_blocking BOOLEAN DEFAULT true,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE public.tm_gate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage gate templates"
  ON public.tm_gate_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Evaluate quality gates RPC
CREATE OR REPLACE FUNCTION public.tm_evaluate_quality_gates(p_release_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate RECORD;
  v_value NUMERIC;
  v_new_status TEXT;
  v_release RECORD;
  v_results JSON[];
  v_total_gates INT := 0;
  v_passed_gates INT := 0;
  v_blocking_total INT := 0;
  v_blocking_passed INT := 0;
BEGIN
  -- Get release metrics
  SELECT * INTO v_release FROM releases WHERE id = p_release_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Release not found');
  END IF;

  FOR v_gate IN
    SELECT * FROM tm_release_quality_gates
    WHERE release_id = p_release_id AND (status IS NULL OR status != 'waived')
  LOOP
    v_total_gates := v_total_gates + 1;
    IF v_gate.is_blocking THEN
      v_blocking_total := v_blocking_total + 1;
    END IF;

    -- Calculate metric value based on gate type
    v_value := CASE v_gate.gate_type
      WHEN 'pass_rate' THEN
        CASE WHEN COALESCE(v_release.test_cases_executed, 0) > 0
          THEN ROUND((COALESCE(v_release.test_cases_passed, 0)::numeric / v_release.test_cases_executed) * 100, 2)
          ELSE 0 END
      WHEN 'execution_rate' THEN
        CASE WHEN COALESCE(v_release.test_cases_total, 0) > 0
          THEN ROUND((COALESCE(v_release.test_cases_executed, 0)::numeric / v_release.test_cases_total) * 100, 2)
          ELSE 0 END
      WHEN 'defect_count' THEN COALESCE(v_release.defects_open, 0)
      WHEN 'blocker_count' THEN COALESCE(v_release.critical_defects, 0)
      WHEN 'coverage' THEN COALESCE(v_release.coverage_percent, 0)
      ELSE 0
    END;

    -- Evaluate against threshold
    v_new_status := CASE
      WHEN v_gate.threshold_operator = '>=' AND v_value >= v_gate.threshold_value THEN 'passed'
      WHEN v_gate.threshold_operator = '<=' AND v_value <= v_gate.threshold_value THEN 'passed'
      WHEN v_gate.threshold_operator = '=' AND v_value = v_gate.threshold_value THEN 'passed'
      WHEN v_gate.threshold_operator = '>' AND v_value > v_gate.threshold_value THEN 'passed'
      WHEN v_gate.threshold_operator = '<' AND v_value < v_gate.threshold_value THEN 'passed'
      ELSE 'failed'
    END;

    IF v_new_status = 'passed' THEN
      v_passed_gates := v_passed_gates + 1;
      IF v_gate.is_blocking THEN
        v_blocking_passed := v_blocking_passed + 1;
      END IF;
    END IF;

    -- Record history if status changed
    IF v_gate.status IS DISTINCT FROM v_new_status THEN
      INSERT INTO tm_gate_evaluation_history (
        gate_id, previous_status, new_status, metric_value, threshold_value, evaluation_type
      ) VALUES (
        v_gate.id, v_gate.status, v_new_status, v_value, v_gate.threshold_value, 'automatic'
      );
    END IF;

    -- Update gate
    UPDATE tm_release_quality_gates SET
      current_value = v_value,
      status = v_new_status,
      last_evaluated_at = NOW()
    WHERE id = v_gate.id;

    v_results := array_append(v_results, json_build_object(
      'gate_id', v_gate.id,
      'name', v_gate.gate_name,
      'status', v_new_status,
      'value', v_value,
      'threshold', v_gate.threshold_value
    ));
  END LOOP;

  -- Also update waived gates with expired waivers
  UPDATE tm_release_quality_gates SET
    status = 'pending',
    waived_at = NULL,
    waived_by = NULL,
    waiver_reason = NULL,
    waiver_expires_at = NULL
  WHERE release_id = p_release_id
    AND status = 'waived'
    AND waiver_expires_at IS NOT NULL
    AND waiver_expires_at < NOW();

  RETURN json_build_object(
    'release_id', p_release_id,
    'evaluated_at', NOW(),
    'gates', COALESCE(v_results, ARRAY[]::JSON[]),
    'total_gates', v_total_gates,
    'passed_gates', v_passed_gates,
    'blocking_total', v_blocking_total,
    'blocking_passed', v_blocking_passed,
    'all_blocking_passed', (v_blocking_passed = v_blocking_total)
  );
END;
$$;

-- 5. Waive gate RPC
CREATE OR REPLACE FUNCTION public.tm_waive_quality_gate(
  p_gate_id UUID,
  p_user_id UUID,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate RECORD;
BEGIN
  SELECT * INTO v_gate FROM tm_release_quality_gates WHERE id = p_gate_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Record history
  INSERT INTO tm_gate_evaluation_history (
    gate_id, previous_status, new_status, metric_value, threshold_value, evaluation_type, evaluated_by, notes
  ) VALUES (
    p_gate_id, v_gate.status, 'waived', COALESCE(v_gate.current_value, 0), v_gate.threshold_value, 'waiver', p_user_id, p_reason
  );

  -- Update gate
  UPDATE tm_release_quality_gates SET
    status = 'waived',
    waived_at = NOW(),
    waived_by = p_user_id,
    waiver_reason = p_reason,
    waiver_expires_at = p_expires_at
  WHERE id = p_gate_id;

  RETURN true;
END;
$$;

-- 6. Get gate evaluation history RPC
CREATE OR REPLACE FUNCTION public.tm_get_gate_history(p_gate_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(h))
    FROM (
      SELECT 
        h.id,
        h.previous_status,
        h.new_status,
        h.metric_value,
        h.threshold_value,
        h.evaluation_type,
        h.notes,
        h.created_at,
        p.full_name as evaluated_by_name
      FROM tm_gate_evaluation_history h
      LEFT JOIN profiles p ON p.id = h.evaluated_by
      WHERE h.gate_id = p_gate_id
      ORDER BY h.created_at DESC
      LIMIT 50
    ) h
  );
END;
$$;
