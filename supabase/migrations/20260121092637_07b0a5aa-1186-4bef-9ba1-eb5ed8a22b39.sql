-- ============================================================
-- MODULE 3B-3: PROGRESS DASHBOARD
-- Database Functions
-- ============================================================

-- ============================================================
-- Function 1: get_run_progress_summary
-- Returns comprehensive progress metrics for a run
-- ============================================================
CREATE OR REPLACE FUNCTION get_run_progress_summary(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run RECORD;
  v_progress RECORD;
  v_elapsed_seconds INTEGER;
  v_velocity DECIMAL;
  v_eta_seconds INTEGER;
BEGIN
  -- Get run info
  SELECT * INTO v_run
  FROM test_execution_runs
  WHERE id = p_run_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Calculate progress
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE result_status IS NOT NULL) as completed,
    COUNT(*) FILTER (WHERE result_status = 'passed') as passed,
    COUNT(*) FILTER (WHERE result_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE result_status = 'blocked') as blocked,
    COUNT(*) FILTER (WHERE result_status = 'skipped') as skipped,
    COUNT(*) FILTER (WHERE result_status IS NULL AND started_at IS NOT NULL) as running,
    COUNT(*) FILTER (WHERE result_status IS NULL AND started_at IS NULL) as queued
  INTO v_progress
  FROM test_execution_results
  WHERE run_id = p_run_id;

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (COALESCE(v_run.completed_at, NOW()) - v_run.started_at))::INTEGER;

  -- Calculate velocity (tests per hour)
  IF v_elapsed_seconds > 0 AND v_progress.completed > 0 THEN
    v_velocity := ROUND((v_progress.completed::DECIMAL / v_elapsed_seconds) * 3600, 2);
  ELSE
    v_velocity := 0;
  END IF;

  -- Calculate ETA
  IF v_velocity > 0 THEN
    v_eta_seconds := ROUND(((v_progress.queued + v_progress.running) / v_velocity) * 3600);
  ELSE
    v_eta_seconds := NULL;
  END IF;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'run_number', v_run.run_number,
    'name', v_run.name,
    'environment', v_run.environment,
    'status', v_run.status,
    'started_at', v_run.started_at,
    'completed_at', v_run.completed_at,
    'total', v_progress.total,
    'completed', v_progress.completed,
    'passed', v_progress.passed,
    'failed', v_progress.failed,
    'blocked', v_progress.blocked,
    'skipped', v_progress.skipped,
    'running', v_progress.running,
    'queued', v_progress.queued,
    'completion_percentage', CASE 
      WHEN v_progress.total > 0 
      THEN ROUND((v_progress.completed::DECIMAL / v_progress.total) * 100, 1)
      ELSE 0
    END,
    'pass_rate', CASE 
      WHEN (v_progress.passed + v_progress.failed + v_progress.blocked) > 0 
      THEN ROUND((v_progress.passed::DECIMAL / (v_progress.passed + v_progress.failed + v_progress.blocked)) * 100, 1)
      ELSE 0
    END,
    'elapsed_seconds', v_elapsed_seconds,
    'velocity_per_hour', v_velocity,
    'eta_seconds', v_eta_seconds
  );
END;
$$;


-- ============================================================
-- Function 2: get_status_breakdown
-- Returns detailed status counts and percentages
-- ============================================================
CREATE OR REPLACE FUNCTION get_status_breakdown(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breakdown JSONB;
  v_total INTEGER;
BEGIN
  -- Get total
  SELECT COUNT(*) INTO v_total
  FROM test_execution_results
  WHERE run_id = p_run_id;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', 'No tests in run');
  END IF;

  -- Calculate breakdown
  SELECT jsonb_build_object(
    'total', v_total,
    'statuses', jsonb_agg(
      jsonb_build_object(
        'status', status,
        'count', cnt,
        'percentage', ROUND((cnt::DECIMAL / v_total) * 100, 1)
      )
    )
  ) INTO v_breakdown
  FROM (
    SELECT 
      COALESCE(result_status, 
        CASE WHEN started_at IS NOT NULL THEN 'running' ELSE 'queued' END
      ) as status,
      COUNT(*) as cnt
    FROM test_execution_results
    WHERE run_id = p_run_id
    GROUP BY 1
    ORDER BY 
      CASE COALESCE(result_status, CASE WHEN started_at IS NOT NULL THEN 'running' ELSE 'queued' END)
        WHEN 'passed' THEN 1
        WHEN 'failed' THEN 2
        WHEN 'blocked' THEN 3
        WHEN 'skipped' THEN 4
        WHEN 'running' THEN 5
        WHEN 'queued' THEN 6
      END
  ) s;

  RETURN v_breakdown;
END;
$$;


-- ============================================================
-- Function 3: get_worker_activity
-- Returns current activity for all workers
-- ============================================================
CREATE OR REPLACE FUNCTION get_worker_activity(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workers JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'worker_number', w.worker_number,
        'status', w.status,
        'current_test', CASE 
          WHEN w.current_test_id IS NOT NULL THEN jsonb_build_object(
            'id', tc.id,
            'case_number', tc.case_number,
            'title', tc.title
          )
          ELSE NULL
        END,
        'progress', CASE
          WHEN w.current_execution_id IS NOT NULL AND w.claimed_at IS NOT NULL THEN
            LEAST(
              ROUND(
                (EXTRACT(EPOCH FROM (NOW() - w.claimed_at)) / 120) * 100
              ),
              99
            )
          ELSE 0
        END,
        'claimed_at', w.claimed_at,
        'last_heartbeat', w.last_heartbeat,
        'completed_count', w.completed_count,
        'failed_count', w.failed_count,
        'is_healthy', (w.last_heartbeat > NOW() - INTERVAL '60 seconds')
      ) ORDER BY w.worker_number
    ),
    '[]'::jsonb
  ) INTO v_workers
  FROM parallel_workers w
  LEFT JOIN test_cases tc ON w.current_test_id = tc.id
  WHERE w.run_id = p_run_id;

  RETURN v_workers;
END;
$$;


-- ============================================================
-- Function 4: get_recent_results
-- Returns most recent test completions
-- ============================================================
CREATE OR REPLACE FUNCTION get_recent_results(
  p_run_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY completed_at DESC),
    '[]'::jsonb
  ) INTO v_results
  FROM (
    SELECT 
      jsonb_build_object(
        'id', er.id,
        'test_case_id', tc.id,
        'case_number', tc.case_number,
        'title', tc.title,
        'result', er.result_status,
        'duration_seconds', EXTRACT(EPOCH FROM (er.completed_at - er.started_at))::INTEGER,
        'completed_at', er.completed_at,
        'executed_by', jsonb_build_object(
          'id', COALESCE(p.id, '00000000-0000-0000-0000-000000000000'),
          'name', COALESCE(p.full_name, p.email, 'Unknown')
        )
      ) as row_data,
      er.completed_at
    FROM test_execution_results er
    JOIN test_cases tc ON er.test_case_id = tc.id
    LEFT JOIN profiles p ON er.executed_by = p.id
    WHERE er.run_id = p_run_id
      AND er.result_status IS NOT NULL
      AND er.completed_at IS NOT NULL
    ORDER BY er.completed_at DESC
    LIMIT p_limit
  ) sub;

  RETURN v_results;
END;
$$;


-- ============================================================
-- Function 5: get_trend_data
-- Returns historical metrics for charting
-- ============================================================
CREATE OR REPLACE FUNCTION get_trend_data(
  p_run_id UUID,
  p_interval_minutes INTEGER DEFAULT 5,
  p_points INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run RECORD;
  v_trend JSONB;
BEGIN
  -- Get run start time
  SELECT * INTO v_run
  FROM test_execution_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Generate time series data
  WITH time_buckets AS (
    SELECT generate_series(
      date_trunc('minute', v_run.started_at),
      NOW(),
      (p_interval_minutes || ' minutes')::INTERVAL
    ) as bucket_time
  ),
  bucket_stats AS (
    SELECT 
      tb.bucket_time,
      COUNT(*) FILTER (WHERE er.completed_at <= tb.bucket_time AND er.result_status = 'passed') as passed,
      COUNT(*) FILTER (WHERE er.completed_at <= tb.bucket_time AND er.result_status IN ('passed', 'failed', 'blocked')) as total_completed
    FROM time_buckets tb
    LEFT JOIN test_execution_results er ON er.run_id = p_run_id
    GROUP BY tb.bucket_time
    ORDER BY tb.bucket_time DESC
    LIMIT p_points
  )
  SELECT jsonb_build_object(
    'data_points', COALESCE(jsonb_agg(
      jsonb_build_object(
        'timestamp', bucket_time,
        'pass_rate', CASE 
          WHEN total_completed > 0 
          THEN ROUND((passed::DECIMAL / total_completed) * 100, 1)
          ELSE 0
        END,
        'completed', total_completed
      ) ORDER BY bucket_time ASC
    ), '[]'::jsonb)
  ) INTO v_trend
  FROM bucket_stats;

  RETURN COALESCE(v_trend, jsonb_build_object('data_points', '[]'::jsonb));
END;
$$;