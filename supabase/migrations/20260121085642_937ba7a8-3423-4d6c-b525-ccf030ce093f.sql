-- ============================================================
-- MODULE 3A-5: TIMER & METRICS TRACKING
-- Database Schema Updates and Functions
-- ============================================================

-- ============================================================
-- Timer State Tracking Columns on test_execution_step_results
-- ============================================================
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMPTZ;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS timer_total_paused INTEGER DEFAULT 0;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT false;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES test_steps(id) ON DELETE SET NULL;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE test_execution_step_results ADD COLUMN IF NOT EXISTS executed_by UUID;

-- ============================================================
-- Time Estimates Table
-- ============================================================
CREATE TABLE IF NOT EXISTS test_time_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
  step_id UUID REFERENCES test_steps(id) ON DELETE SET NULL,
  estimated_seconds INTEGER NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'historical', 'ai')),
  confidence DECIMAL(3,2) DEFAULT 1.0,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_estimates_case ON test_time_estimates(test_case_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_step ON test_time_estimates(step_id);

-- RLS Policies for test_time_estimates (using authenticated user check)
ALTER TABLE test_time_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage time estimates"
  ON test_time_estimates FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Function 1: start_step_timer
-- ============================================================
CREATE OR REPLACE FUNCTION start_step_timer(
  p_execution_id UUID,
  p_step_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_result_id UUID;
  v_actor UUID := auth.uid();
BEGIN
  -- Update existing step result with timer start
  UPDATE test_execution_step_results SET
    timer_started_at = CASE 
      WHEN timer_started_at IS NULL THEN NOW()
      ELSE timer_started_at
    END,
    timer_paused_at = NULL,
    is_timer_running = true,
    step_id = p_step_id,
    executed_by = v_actor
  WHERE execution_id = p_execution_id 
    AND (step_id = p_step_id OR step_id IS NULL)
  RETURNING id INTO v_step_result_id;

  -- If no existing row, try insert
  IF v_step_result_id IS NULL THEN
    INSERT INTO test_execution_step_results (
      execution_id,
      step_id,
      step_order,
      step_description,
      status,
      timer_started_at,
      is_timer_running,
      executed_by
    ) 
    SELECT 
      p_execution_id,
      ts.id,
      ts.step_order,
      ts.action,
      'pending',
      NOW(),
      true,
      v_actor
    FROM test_steps ts
    WHERE ts.id = p_step_id
    RETURNING id INTO v_step_result_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step_result_id', v_step_result_id,
    'started_at', NOW()
  );
END;
$$;

-- ============================================================
-- Function 2: pause_step_timer
-- ============================================================
CREATE OR REPLACE FUNCTION pause_step_timer(
  p_execution_id UUID,
  p_step_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  UPDATE test_execution_step_results SET
    timer_paused_at = NOW(),
    is_timer_running = false
  WHERE execution_id = p_execution_id 
    AND step_id = p_step_id
    AND is_timer_running = true
  RETURNING id, timer_started_at, timer_paused_at, timer_total_paused INTO v_result;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No active timer found for this step');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'paused_at', v_result.timer_paused_at,
    'elapsed_seconds', EXTRACT(EPOCH FROM (v_result.timer_paused_at - v_result.timer_started_at))::INTEGER - COALESCE(v_result.timer_total_paused, 0)
  );
END;
$$;

-- ============================================================
-- Function 3: resume_step_timer
-- ============================================================
CREATE OR REPLACE FUNCTION resume_step_timer(
  p_execution_id UUID,
  p_step_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
  v_pause_duration INTEGER;
BEGIN
  SELECT * INTO v_result
  FROM test_execution_step_results
  WHERE execution_id = p_execution_id 
    AND step_id = p_step_id
    AND timer_paused_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No paused timer found for this step');
  END IF;

  v_pause_duration := EXTRACT(EPOCH FROM (NOW() - v_result.timer_paused_at))::INTEGER;

  UPDATE test_execution_step_results SET
    timer_paused_at = NULL,
    timer_total_paused = COALESCE(timer_total_paused, 0) + v_pause_duration,
    is_timer_running = true
  WHERE id = v_result.id;

  RETURN jsonb_build_object(
    'success', true,
    'resumed_at', NOW(),
    'total_paused_seconds', COALESCE(v_result.timer_total_paused, 0) + v_pause_duration
  );
END;
$$;

-- ============================================================
-- Function 4: complete_step_timer
-- ============================================================
CREATE OR REPLACE FUNCTION complete_step_timer(
  p_execution_id UUID,
  p_step_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
  v_duration INTEGER;
BEGIN
  SELECT * INTO v_result
  FROM test_execution_step_results
  WHERE execution_id = p_execution_id AND step_id = p_step_id;

  IF NOT FOUND OR v_result.timer_started_at IS NULL THEN
    RETURN jsonb_build_object('error', 'No timer found for this step');
  END IF;

  IF v_result.is_timer_running THEN
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_result.timer_started_at))::INTEGER - COALESCE(v_result.timer_total_paused, 0);
  ELSE
    v_duration := EXTRACT(EPOCH FROM (v_result.timer_paused_at - v_result.timer_started_at))::INTEGER - COALESCE(v_result.timer_total_paused, 0);
  END IF;

  UPDATE test_execution_step_results SET
    started_at = timer_started_at,
    completed_at = NOW(),
    is_timer_running = false
  WHERE id = v_result.id;

  RETURN jsonb_build_object(
    'success', true,
    'duration_seconds', v_duration,
    'started_at', v_result.timer_started_at,
    'completed_at', NOW()
  );
END;
$$;

-- ============================================================
-- Function 5: get_step_metrics
-- ============================================================
CREATE OR REPLACE FUNCTION get_step_metrics(p_execution_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'step_id', s.id,
        'step_number', s.step_order,
        'actual_duration', CASE 
          WHEN sr.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sr.completed_at - sr.started_at))::INTEGER
          WHEN sr.is_timer_running THEN
            EXTRACT(EPOCH FROM (NOW() - sr.timer_started_at))::INTEGER - COALESCE(sr.timer_total_paused, 0)
          WHEN sr.timer_paused_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (sr.timer_paused_at - sr.timer_started_at))::INTEGER - COALESCE(sr.timer_total_paused, 0)
          ELSE NULL
        END,
        'estimated_duration', COALESCE(te.estimated_seconds, 60),
        'result', sr.status,
        'is_timer_running', COALESCE(sr.is_timer_running, false)
      ) ORDER BY s.step_order
    ),
    '[]'::jsonb
  ) INTO v_metrics
  FROM test_steps s
  JOIN test_execution_results er ON s.test_case_id = er.test_case_id
  LEFT JOIN test_execution_step_results sr ON sr.step_id = s.id AND sr.execution_id = er.id
  LEFT JOIN test_time_estimates te ON te.step_id = s.id
  WHERE er.id = p_execution_id;

  RETURN v_metrics;
END;
$$;

-- ============================================================
-- Function 6: get_case_metrics
-- ============================================================
CREATE OR REPLACE FUNCTION get_case_metrics(p_execution_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT
    er.id,
    er.started_at,
    er.completed_at,
    tc.id as test_case_id,
    tc.case_number,
    COALESCE(te.estimated_seconds, 300) as estimated_duration,
    COUNT(s.id) as total_steps,
    COUNT(sr.id) FILTER (WHERE sr.status IS NOT NULL AND sr.status != 'pending') as completed_steps,
    COUNT(sr.id) FILTER (WHERE sr.status = 'passed') as passed_steps,
    COUNT(sr.id) FILTER (WHERE sr.status = 'failed') as failed_steps,
    SUM(
      CASE 
        WHEN sr.completed_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (sr.completed_at - sr.started_at))::INTEGER
        ELSE 0
      END
    ) as total_actual_time,
    SUM(COALESCE(ste.estimated_seconds, 60)) as total_estimated_time
  INTO v_result
  FROM test_execution_results er
  JOIN test_cases tc ON er.test_case_id = tc.id
  LEFT JOIN test_time_estimates te ON te.test_case_id = tc.id AND te.step_id IS NULL
  LEFT JOIN test_steps s ON s.test_case_id = tc.id
  LEFT JOIN test_execution_step_results sr ON sr.step_id = s.id AND sr.execution_id = er.id
  LEFT JOIN test_time_estimates ste ON ste.step_id = s.id
  WHERE er.id = p_execution_id
  GROUP BY er.id, tc.id, te.estimated_seconds;

  RETURN jsonb_build_object(
    'execution_id', v_result.id,
    'test_case_id', v_result.test_case_id,
    'case_number', v_result.case_number,
    'started_at', v_result.started_at,
    'completed_at', v_result.completed_at,
    'estimated_duration', v_result.estimated_duration,
    'total_steps', v_result.total_steps,
    'completed_steps', v_result.completed_steps,
    'passed_steps', v_result.passed_steps,
    'failed_steps', v_result.failed_steps,
    'total_actual_time', v_result.total_actual_time,
    'total_estimated_time', v_result.total_estimated_time,
    'completion_percentage', ROUND((v_result.completed_steps::DECIMAL / NULLIF(v_result.total_steps, 0)) * 100, 1)
  );
END;
$$;

-- ============================================================
-- Function 7: get_run_metrics
-- ============================================================
CREATE OR REPLACE FUNCTION get_run_metrics(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run RECORD;
  v_metrics RECORD;
  v_velocity DECIMAL;
  v_eta_seconds INTEGER;
BEGIN
  SELECT * INTO v_run
  FROM test_execution_runs
  WHERE id = p_run_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  SELECT
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE result_status IS NOT NULL) as completed_cases,
    COUNT(*) FILTER (WHERE result_status = 'passed') as passed_cases,
    COUNT(*) FILTER (WHERE result_status = 'failed') as failed_cases,
    COUNT(*) FILTER (WHERE result_status = 'blocked') as blocked_cases,
    COUNT(*) FILTER (WHERE result_status = 'skipped') as skipped_cases,
    SUM(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)))::INTEGER as total_execution_time,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::INTEGER as avg_case_duration
  INTO v_metrics
  FROM test_execution_results
  WHERE run_id = p_run_id;

  IF v_metrics.total_execution_time > 0 AND v_metrics.completed_cases > 0 THEN
    v_velocity := ROUND((v_metrics.completed_cases::DECIMAL / v_metrics.total_execution_time) * 3600, 1);
  ELSE
    v_velocity := 0;
  END IF;

  IF v_velocity > 0 THEN
    v_eta_seconds := ((v_metrics.total_cases - v_metrics.completed_cases) / v_velocity * 3600)::INTEGER;
  ELSE
    v_eta_seconds := NULL;
  END IF;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'run_number', v_run.run_number,
    'started_at', v_run.started_at,
    'total_cases', v_metrics.total_cases,
    'completed_cases', v_metrics.completed_cases,
    'remaining_cases', v_metrics.total_cases - v_metrics.completed_cases,
    'passed_cases', v_metrics.passed_cases,
    'failed_cases', v_metrics.failed_cases,
    'blocked_cases', v_metrics.blocked_cases,
    'skipped_cases', v_metrics.skipped_cases,
    'pass_rate', CASE 
      WHEN v_metrics.completed_cases > 0 
      THEN ROUND((v_metrics.passed_cases::DECIMAL / v_metrics.completed_cases) * 100, 1)
      ELSE 0
    END,
    'total_execution_time', v_metrics.total_execution_time,
    'avg_case_duration', v_metrics.avg_case_duration,
    'velocity_per_hour', v_velocity,
    'estimated_remaining_seconds', v_eta_seconds,
    'estimated_completion_time', CASE 
      WHEN v_eta_seconds IS NOT NULL 
      THEN NOW() + (v_eta_seconds * INTERVAL '1 second')
      ELSE NULL
    END
  );
END;
$$;