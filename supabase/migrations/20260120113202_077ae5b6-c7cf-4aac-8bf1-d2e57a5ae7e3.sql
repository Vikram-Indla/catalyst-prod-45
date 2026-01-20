-- ============================================================
-- MODULE 3A-2: STEP-BY-STEP RUNNER UI
-- Database Functions for Step Execution (using existing tm_* tables)
-- ============================================================

-- ============================================================
-- Function 1: get_test_case_for_execution_v2
-- Retrieves a test case with all steps for execution (uses tm_* tables)
-- ============================================================
CREATE OR REPLACE FUNCTION get_test_case_for_execution_v2(
  p_run_id UUID,
  p_test_case_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps JSONB;
  v_run RECORD;
BEGIN
  -- Get run info
  SELECT * INTO v_run
  FROM tm_test_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Get test case
  SELECT 
    tc.*,
    f.name as folder_name
  INTO v_case
  FROM tm_test_cases tc
  LEFT JOIN tm_folders f ON tc.folder_id = f.id
  WHERE tc.id = p_test_case_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Test case not found');
  END IF;

  -- Get steps with any existing step results
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'step_number', s.step_number,
        'action', s.action,
        'expected_result', s.expected_result,
        'test_data', s.test_data,
        'result', sr.status,
        'actual_result', sr.actual_result,
        'notes', NULL,
        'duration', sr.duration_seconds,
        'evidence', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', e.id,
            'type', e.mime_type,
            'filename', e.file_name,
            'url', e.storage_path
          ))
          FROM step_result_attachments e
          WHERE e.step_result_id = sr.id),
          '[]'::jsonb
        )
      ) ORDER BY s.step_number
    ),
    '[]'::jsonb
  ) INTO v_steps
  FROM tm_test_steps s
  LEFT JOIN tm_step_results sr ON sr.test_step_id = s.id AND sr.test_run_id = p_run_id
  WHERE s.test_case_id = p_test_case_id;

  RETURN jsonb_build_object(
    'id', v_case.id,
    'case_number', v_case.key,
    'title', v_case.title,
    'description', v_case.objective,
    'priority', v_case.priority,
    'suite_name', COALESCE(v_case.folder_name, 'Uncategorized'),
    'preconditions', COALESCE(v_case.preconditions, ''),
    'steps', v_steps,
    'execution', jsonb_build_object(
      'id', v_run.id,
      'execution_order', 1,
      'overall_result', v_run.status,
      'started_at', v_run.executed_at,
      'completed_at', CASE WHEN v_run.status IN ('passed', 'failed', 'blocked') THEN v_run.executed_at END,
      'total_duration', v_run.duration_seconds
    ),
    'run', jsonb_build_object(
      'id', v_run.id,
      'run_number', 1,
      'name', v_case.title,
      'environment', COALESCE(v_run.environment_details, 'default'),
      'configuration', jsonb_build_object()
    )
  );
END;
$$;

-- ============================================================
-- Function 2: update_step_result_v2
-- Records the result for a single test step (uses tm_step_results)
-- ============================================================
CREATE OR REPLACE FUNCTION update_step_result_v2(
  p_run_id UUID,
  p_step_id UUID,
  p_result TEXT,
  p_notes TEXT DEFAULT NULL,
  p_actual_result TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
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
  -- Validate result
  IF p_result NOT IN ('passed', 'failed', 'blocked', 'skipped', 'not_run') THEN
    RETURN jsonb_build_object('error', 'Invalid result. Must be passed, failed, blocked, skipped, or not_run');
  END IF;

  -- Validate run exists
  IF NOT EXISTS (SELECT 1 FROM tm_test_runs WHERE id = p_run_id) THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Validate step exists
  IF NOT EXISTS (SELECT 1 FROM tm_test_steps WHERE id = p_step_id) THEN
    RETURN jsonb_build_object('error', 'Step not found');
  END IF;

  -- Upsert step result
  INSERT INTO tm_step_results (
    test_run_id,
    test_step_id,
    status,
    actual_result,
    executed_by,
    executed_at,
    duration_seconds
  ) VALUES (
    p_run_id,
    p_step_id,
    p_result::tm_execution_status,
    NULLIF(TRIM(COALESCE(p_actual_result, '')), ''),
    v_actor,
    NOW(),
    COALESCE(p_duration_seconds, 0)
  )
  ON CONFLICT (test_run_id, test_step_id) DO UPDATE SET
    status = EXCLUDED.status,
    actual_result = EXCLUDED.actual_result,
    executed_by = EXCLUDED.executed_by,
    executed_at = EXCLUDED.executed_at,
    duration_seconds = EXCLUDED.duration_seconds,
    updated_at = NOW()
  RETURNING id INTO v_step_result_id;

  -- Update run status to in_progress if not started
  UPDATE tm_test_runs
  SET status = CASE 
    WHEN status = 'not_run' THEN 'in_progress'::tm_execution_status 
    ELSE status 
  END,
  executed_at = COALESCE(executed_at, NOW()),
  updated_at = NOW()
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'success', true,
    'step_result_id', v_step_result_id,
    'result', p_result
  );
END;
$$;

-- ============================================================
-- Function 3: complete_test_run_v2
-- Finalizes test run execution with overall result
-- ============================================================
CREATE OR REPLACE FUNCTION complete_test_run_v2(
  p_run_id UUID,
  p_overall_result TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_summary RECORD;
  v_started_at TIMESTAMPTZ;
  v_duration INTEGER;
BEGIN
  -- Validate overall result
  IF p_overall_result NOT IN ('passed', 'failed', 'blocked', 'skipped') THEN
    RETURN jsonb_build_object('error', 'Invalid overall result. Must be passed, failed, blocked, or skipped');
  END IF;

  -- Validate run exists
  IF NOT EXISTS (SELECT 1 FROM tm_test_runs WHERE id = p_run_id) THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Get step summary
  SELECT
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE sr.status IS NOT NULL AND sr.status != 'not_run') as executed_steps,
    COUNT(*) FILTER (WHERE sr.status = 'failed') as failed_steps,
    COUNT(*) FILTER (WHERE sr.status = 'blocked') as blocked_steps,
    COUNT(*) FILTER (WHERE sr.status = 'passed') as passed_steps,
    COALESCE(SUM(sr.duration_seconds), 0) as total_duration
  INTO v_step_summary
  FROM tm_test_steps s
  JOIN tm_test_runs r ON s.test_case_id = r.test_case_id
  LEFT JOIN tm_step_results sr ON sr.test_step_id = s.id AND sr.test_run_id = r.id
  WHERE r.id = p_run_id;

  -- Get started time
  SELECT executed_at INTO v_started_at
  FROM tm_test_runs WHERE id = p_run_id;

  -- Calculate total duration
  v_duration := COALESCE(v_step_summary.total_duration, 0);
  IF v_started_at IS NOT NULL THEN
    v_duration := GREATEST(v_duration, EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER);
  END IF;

  -- Update run
  UPDATE tm_test_runs SET
    status = p_overall_result::tm_execution_status,
    comments = NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    duration_seconds = v_duration,
    updated_at = NOW()
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'success', true,
    'run_id', p_run_id,
    'overall_result', p_overall_result,
    'summary', jsonb_build_object(
      'total_steps', COALESCE(v_step_summary.total_steps, 0),
      'executed_steps', COALESCE(v_step_summary.executed_steps, 0),
      'passed_steps', COALESCE(v_step_summary.passed_steps, 0),
      'failed_steps', COALESCE(v_step_summary.failed_steps, 0),
      'blocked_steps', COALESCE(v_step_summary.blocked_steps, 0),
      'total_duration', v_duration
    )
  );
END;
$$;

-- ============================================================
-- Function 4: get_next_test_in_cycle
-- Gets the next test case in the cycle queue
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_test_in_cycle(
  p_cycle_id UUID,
  p_current_run_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_order TIMESTAMPTZ;
  v_next_run RECORD;
BEGIN
  -- Get current run timestamp if provided
  IF p_current_run_id IS NOT NULL THEN
    SELECT created_at INTO v_current_order
    FROM tm_test_runs
    WHERE id = p_current_run_id;
  END IF;

  -- Find next unexecuted or in-progress test
  SELECT 
    r.id as run_id,
    r.test_case_id,
    tc.key as case_number,
    tc.title
  INTO v_next_run
  FROM tm_test_runs r
  JOIN tm_test_cases tc ON r.test_case_id = tc.id
  WHERE r.cycle_id = p_cycle_id
    AND (p_current_run_id IS NULL OR r.created_at > v_current_order)
    AND r.status IN ('not_run', 'in_progress')
  ORDER BY r.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check if all cases are complete
    IF EXISTS (
      SELECT 1 FROM tm_test_runs
      WHERE cycle_id = p_cycle_id AND status = 'not_run'
    ) THEN
      RETURN jsonb_build_object('status', 'has_remaining', 'message', 'There are remaining test cases');
    ELSE
      RETURN jsonb_build_object('status', 'all_complete', 'message', 'All test cases have been executed');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'found',
    'run_id', v_next_run.run_id,
    'test_case_id', v_next_run.test_case_id,
    'case_number', v_next_run.case_number,
    'title', v_next_run.title
  );
END;
$$;

-- ============================================================
-- Function 5: save_step_notes_v2
-- Saves notes for a step without changing result
-- ============================================================
CREATE OR REPLACE FUNCTION save_step_notes_v2(
  p_run_id UUID,
  p_step_id UUID,
  p_actual_result TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  -- Update or insert notes (using actual_result field since tm_step_results doesn't have notes)
  INSERT INTO tm_step_results (
    test_run_id,
    test_step_id,
    actual_result,
    executed_by,
    executed_at
  ) VALUES (
    p_run_id,
    p_step_id,
    NULLIF(TRIM(COALESCE(p_actual_result, '')), ''),
    v_actor,
    NOW()
  )
  ON CONFLICT (test_run_id, test_step_id) DO UPDATE SET
    actual_result = EXCLUDED.actual_result,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- Add unique constraint if missing for upsert support
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tm_step_results_test_run_id_test_step_id_key'
  ) THEN
    ALTER TABLE tm_step_results 
    ADD CONSTRAINT tm_step_results_test_run_id_test_step_id_key 
    UNIQUE (test_run_id, test_step_id);
  END IF;
END $$;