-- ============================================================
-- MODULE 3B-1: PARALLEL TEST RUNNER
-- Database Schema and Functions
-- ============================================================

-- Worker Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
    CREATE TYPE worker_status AS ENUM ('idle', 'running', 'paused', 'error', 'terminated');
  END IF;
END$$;

-- Parallel Run Configuration
CREATE TABLE IF NOT EXISTS parallel_run_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES test_execution_runs(id) ON DELETE CASCADE,
  max_workers INTEGER NOT NULL DEFAULT 3 CHECK (max_workers BETWEEN 1 AND 10),
  priority_mode TEXT DEFAULT 'fifo' CHECK (priority_mode IN ('fifo', 'priority', 'random')),
  retry_failed BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 1,
  timeout_seconds INTEGER DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id)
);

-- Worker State Tracking
CREATE TABLE IF NOT EXISTS parallel_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES test_execution_runs(id) ON DELETE CASCADE,
  worker_number INTEGER NOT NULL,
  status worker_status DEFAULT 'idle',
  current_test_id UUID REFERENCES test_cases(id),
  current_execution_id UUID REFERENCES test_execution_results(id),
  claimed_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  completed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_execution_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, worker_number)
);

CREATE INDEX IF NOT EXISTS idx_parallel_workers_run ON parallel_workers(run_id);
CREATE INDEX IF NOT EXISTS idx_parallel_workers_status ON parallel_workers(status);
CREATE INDEX IF NOT EXISTS idx_parallel_workers_heartbeat ON parallel_workers(last_heartbeat);

-- Execution Queue
CREATE TABLE IF NOT EXISTS execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES test_execution_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id),
  execution_result_id UUID REFERENCES test_execution_results(id),
  priority INTEGER DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  position INTEGER,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'skipped')),
  claimed_by UUID REFERENCES parallel_workers(id),
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_execution_queue_run ON execution_queue(run_id);
CREATE INDEX IF NOT EXISTS idx_execution_queue_status ON execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_execution_queue_priority ON execution_queue(priority DESC, position ASC);
CREATE INDEX IF NOT EXISTS idx_execution_queue_claimed ON execution_queue(claimed_by);

-- Enable RLS
ALTER TABLE parallel_run_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parallel_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage parallel configs"
  ON parallel_run_configs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage workers"
  ON parallel_workers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage queue"
  ON execution_queue FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE parallel_workers;
ALTER PUBLICATION supabase_realtime ADD TABLE execution_queue;

-- ============================================================
-- Function 1: create_parallel_run
-- ============================================================
CREATE OR REPLACE FUNCTION create_parallel_run(
  p_run_id UUID,
  p_max_workers INTEGER DEFAULT 3,
  p_priority_mode TEXT DEFAULT 'priority'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_id UUID;
  v_queue_count INTEGER;
BEGIN
  -- Validate run exists
  IF NOT EXISTS (SELECT 1 FROM test_execution_runs WHERE id = p_run_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Create config
  INSERT INTO parallel_run_configs (run_id, max_workers, priority_mode)
  VALUES (p_run_id, p_max_workers, p_priority_mode)
  ON CONFLICT (run_id) DO UPDATE SET
    max_workers = p_max_workers,
    priority_mode = p_priority_mode
  RETURNING id INTO v_config_id;

  -- Create workers
  FOR i IN 1..p_max_workers LOOP
    INSERT INTO parallel_workers (run_id, worker_number, status)
    VALUES (p_run_id, i, 'idle')
    ON CONFLICT (run_id, worker_number) DO UPDATE SET
      status = 'idle',
      current_test_id = NULL,
      current_execution_id = NULL,
      last_heartbeat = NOW();
  END LOOP;

  -- Populate queue from run's test cases
  INSERT INTO execution_queue (run_id, test_case_id, execution_result_id, priority, position)
  SELECT 
    p_run_id,
    er.test_case_id,
    er.id,
    CASE tc.priority
      WHEN 'critical' THEN 100
      WHEN 'high' THEN 75
      WHEN 'medium' THEN 50
      WHEN 'low' THEN 25
      ELSE 50
    END,
    ROW_NUMBER() OVER (ORDER BY tc.priority DESC, tc.created_at ASC)
  FROM test_execution_results er
  JOIN test_cases tc ON er.test_case_id = tc.id
  WHERE er.run_id = p_run_id
    AND er.result_status IS NULL
  ON CONFLICT (run_id, test_case_id) DO NOTHING;

  SELECT COUNT(*) INTO v_queue_count
  FROM execution_queue
  WHERE run_id = p_run_id AND status = 'queued';

  RETURN jsonb_build_object(
    'success', true,
    'config_id', v_config_id,
    'workers', p_max_workers,
    'queue_count', v_queue_count
  );
END;
$$;

-- ============================================================
-- Function 2: claim_next_test
-- ============================================================
CREATE OR REPLACE FUNCTION claim_next_test(
  p_run_id UUID,
  p_worker_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_item RECORD;
  v_test_case RECORD;
  v_config RECORD;
BEGIN
  -- Get config
  SELECT * INTO v_config
  FROM parallel_run_configs
  WHERE run_id = p_run_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Parallel run not configured');
  END IF;

  -- Claim next available test (atomic with row lock)
  SELECT eq.* INTO v_queue_item
  FROM execution_queue eq
  WHERE eq.run_id = p_run_id
    AND eq.status = 'queued'
  ORDER BY 
    CASE WHEN v_config.priority_mode = 'priority' THEN eq.priority END DESC,
    CASE WHEN v_config.priority_mode = 'fifo' THEN eq.position END ASC,
    CASE WHEN v_config.priority_mode = 'random' THEN RANDOM() END
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('empty', true, 'message', 'No tests available in queue');
  END IF;

  -- Update queue item
  UPDATE execution_queue SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = NOW()
  WHERE id = v_queue_item.id;

  -- Update worker
  UPDATE parallel_workers SET
    status = 'running',
    current_test_id = v_queue_item.test_case_id,
    current_execution_id = v_queue_item.execution_result_id,
    claimed_at = NOW(),
    last_heartbeat = NOW()
  WHERE id = p_worker_id;

  -- Get test case details
  SELECT tc.*, er.id as execution_id
  INTO v_test_case
  FROM test_cases tc
  JOIN test_execution_results er ON er.test_case_id = tc.id
  WHERE tc.id = v_queue_item.test_case_id
    AND er.id = v_queue_item.execution_result_id;

  RETURN jsonb_build_object(
    'success', true,
    'queue_item_id', v_queue_item.id,
    'test_case', jsonb_build_object(
      'id', v_test_case.id,
      'case_number', v_test_case.case_number,
      'title', v_test_case.title,
      'priority', v_test_case.priority
    ),
    'execution_id', v_test_case.execution_id
  );
END;
$$;

-- ============================================================
-- Function 3: complete_test_execution
-- ============================================================
CREATE OR REPLACE FUNCTION complete_parallel_test(
  p_worker_id UUID,
  p_result_status TEXT,
  p_execution_time INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker RECORD;
  v_queue_item_id UUID;
BEGIN
  -- Get worker state
  SELECT * INTO v_worker
  FROM parallel_workers
  WHERE id = p_worker_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Worker not found');
  END IF;

  IF v_worker.current_execution_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Worker has no active test');
  END IF;

  -- Update queue item
  UPDATE execution_queue SET
    status = CASE WHEN p_result_status IN ('passed', 'failed', 'blocked', 'skipped') THEN 'completed' ELSE p_result_status END,
    completed_at = NOW()
  WHERE execution_result_id = v_worker.current_execution_id
  RETURNING id INTO v_queue_item_id;

  -- Update execution result
  UPDATE test_execution_results SET
    result_status = p_result_status,
    completed_at = NOW()
  WHERE id = v_worker.current_execution_id;

  -- Update worker stats
  UPDATE parallel_workers SET
    status = 'idle',
    current_test_id = NULL,
    current_execution_id = NULL,
    claimed_at = NULL,
    last_heartbeat = NOW(),
    completed_count = completed_count + CASE WHEN p_result_status IN ('passed', 'blocked', 'skipped') THEN 1 ELSE 0 END,
    failed_count = failed_count + CASE WHEN p_result_status = 'failed' THEN 1 ELSE 0 END,
    total_execution_time = total_execution_time + p_execution_time
  WHERE id = p_worker_id;

  RETURN jsonb_build_object(
    'success', true,
    'queue_item_id', v_queue_item_id,
    'result_status', p_result_status
  );
END;
$$;

-- ============================================================
-- Function 4: get_worker_status
-- ============================================================
CREATE OR REPLACE FUNCTION get_worker_status(p_run_id UUID)
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
        'claimed_at', w.claimed_at,
        'last_heartbeat', w.last_heartbeat,
        'completed_count', w.completed_count,
        'failed_count', w.failed_count,
        'total_execution_time', w.total_execution_time,
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
-- Function 5: requeue_abandoned_tests
-- ============================================================
CREATE OR REPLACE FUNCTION requeue_abandoned_tests(
  p_run_id UUID,
  p_timeout_seconds INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requeued INTEGER := 0;
  v_worker RECORD;
BEGIN
  FOR v_worker IN
    SELECT w.*, eq.id as queue_item_id
    FROM parallel_workers w
    JOIN execution_queue eq ON eq.claimed_by = w.id
    WHERE w.run_id = p_run_id
      AND w.status = 'running'
      AND w.last_heartbeat < NOW() - (p_timeout_seconds * INTERVAL '1 second')
      AND eq.status = 'claimed'
  LOOP
    UPDATE execution_queue SET
      status = 'queued',
      claimed_by = NULL,
      claimed_at = NULL,
      retry_count = retry_count + 1
    WHERE id = v_worker.queue_item_id;

    UPDATE parallel_workers SET
      status = 'error',
      current_test_id = NULL,
      current_execution_id = NULL,
      claimed_at = NULL
    WHERE id = v_worker.id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued_count', v_requeued);
END;
$$;

-- ============================================================
-- Function 6: get_parallel_run_progress
-- ============================================================
CREATE OR REPLACE FUNCTION get_parallel_run_progress(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress RECORD;
  v_config RECORD;
  v_eta_seconds INTEGER;
BEGIN
  SELECT * INTO v_config
  FROM parallel_run_configs
  WHERE run_id = p_run_id;

  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'queued') as queued,
    COUNT(*) FILTER (WHERE status IN ('claimed', 'running')) as running,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'skipped') as skipped
  INTO v_progress
  FROM execution_queue
  WHERE run_id = p_run_id;

  SELECT 
    CASE 
      WHEN v_progress.completed > 0 THEN
        ((v_progress.queued + v_progress.running) * 
         (SUM(total_execution_time) / NULLIF(SUM(completed_count), 0)))::INTEGER
      ELSE NULL
    END INTO v_eta_seconds
  FROM parallel_workers
  WHERE run_id = p_run_id;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'max_workers', COALESCE(v_config.max_workers, 0),
    'total', v_progress.total,
    'queued', v_progress.queued,
    'running', v_progress.running,
    'completed', v_progress.completed,
    'failed', v_progress.failed,
    'skipped', v_progress.skipped,
    'progress_percentage', ROUND((v_progress.completed::DECIMAL / NULLIF(v_progress.total, 0)) * 100, 1),
    'estimated_remaining_seconds', v_eta_seconds
  );
END;
$$;

-- ============================================================
-- Function 7: worker_heartbeat
-- ============================================================
CREATE OR REPLACE FUNCTION worker_heartbeat(p_worker_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE parallel_workers SET
    last_heartbeat = NOW()
  WHERE id = p_worker_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Worker not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'heartbeat_at', NOW());
END;
$$;