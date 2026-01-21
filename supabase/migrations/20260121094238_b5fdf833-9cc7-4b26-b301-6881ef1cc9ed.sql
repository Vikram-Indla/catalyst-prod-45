-- ============================================================
-- MODULE 3B-4: RESOURCE ALLOCATION FUNCTIONS
-- ============================================================

-- ============================================================
-- Function 1: get_resource_summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_resource_summary(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_env_summary RECORD;
  v_pool_summary RECORD;
  v_active_runs INTEGER;
BEGIN
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'available') as available,
    COALESCE(SUM(capacity), 0) as total_capacity,
    COALESCE(SUM(allocated), 0) as total_allocated
  INTO v_env_summary
  FROM test_environments
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  SELECT
    COUNT(*) as total_pools,
    COALESCE(SUM(total_workers), 0) as total_workers,
    COALESCE(SUM(available_workers), 0) as available_workers,
    COALESCE(SUM(assigned_workers), 0) as assigned_workers
  INTO v_pool_summary
  FROM worker_pools
  WHERE project_id = p_project_id;

  SELECT COUNT(*) INTO v_active_runs
  FROM test_execution_runs r
  JOIN resource_allocations ra ON ra.run_id = r.id
  WHERE r.project_id = p_project_id
    AND r.status = 'running'
    AND ra.released_at IS NULL;

  RETURN jsonb_build_object(
    'environments', jsonb_build_object(
      'total', COALESCE(v_env_summary.total, 0),
      'available', COALESCE(v_env_summary.available, 0),
      'total_capacity', COALESCE(v_env_summary.total_capacity, 0),
      'total_allocated', COALESCE(v_env_summary.total_allocated, 0),
      'utilization_percentage', CASE 
        WHEN COALESCE(v_env_summary.total_capacity, 0) > 0 
        THEN ROUND((COALESCE(v_env_summary.total_allocated, 0)::DECIMAL / v_env_summary.total_capacity) * 100, 1)
        ELSE 0
      END
    ),
    'worker_pools', jsonb_build_object(
      'total_pools', COALESCE(v_pool_summary.total_pools, 0),
      'total_workers', COALESCE(v_pool_summary.total_workers, 0),
      'available_workers', COALESCE(v_pool_summary.available_workers, 0),
      'assigned_workers', COALESCE(v_pool_summary.assigned_workers, 0)
    ),
    'active_runs', COALESCE(v_active_runs, 0)
  );
END;
$$;

-- ============================================================
-- Function 2: get_environments
-- ============================================================
CREATE OR REPLACE FUNCTION get_environments(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_environments JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'url', e.url,
        'status', e.status,
        'capacity', e.capacity,
        'allocated', e.allocated,
        'available', e.capacity - e.allocated,
        'utilization_percentage', ROUND((e.allocated::DECIMAL / NULLIF(e.capacity, 0)) * 100, 1),
        'active_runs', (
          SELECT COUNT(*)
          FROM resource_allocations ra
          JOIN test_execution_runs r ON ra.run_id = r.id
          WHERE ra.environment_id = e.id
            AND r.status = 'running'
            AND ra.released_at IS NULL
        ),
        'metadata', e.metadata
      ) ORDER BY e.name
    ),
    '[]'::jsonb
  ) INTO v_environments
  FROM test_environments e
  WHERE e.project_id = p_project_id AND e.deleted_at IS NULL;

  RETURN v_environments;
END;
$$;

-- ============================================================
-- Function 3: allocate_workers
-- ============================================================
CREATE OR REPLACE FUNCTION allocate_workers(
  p_run_id UUID,
  p_environment_id UUID,
  p_worker_count INTEGER,
  p_worker_pool_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_env RECORD;
  v_pool RECORD;
  v_available INTEGER;
  v_allocation_id UUID;
BEGIN
  SELECT * INTO v_env
  FROM test_environments
  WHERE id = p_environment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Environment not found');
  END IF;

  IF v_env.status != 'available' THEN
    RETURN jsonb_build_object('error', 'Environment is not available');
  END IF;

  v_available := v_env.capacity - v_env.allocated;
  IF p_worker_count > v_available THEN
    RETURN jsonb_build_object('error', 'Insufficient capacity', 'available', v_available);
  END IF;

  IF p_worker_pool_id IS NOT NULL THEN
    SELECT * INTO v_pool
    FROM worker_pools
    WHERE id = p_worker_pool_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Worker pool not found');
    END IF;

    IF v_pool.available_workers < p_worker_count THEN
      RETURN jsonb_build_object('error', 'Insufficient workers in pool', 'available', v_pool.available_workers);
    END IF;

    UPDATE worker_pools SET
      available_workers = available_workers - p_worker_count,
      assigned_workers = assigned_workers + p_worker_count,
      updated_at = NOW()
    WHERE id = p_worker_pool_id;
  END IF;

  UPDATE test_environments SET
    allocated = allocated + p_worker_count,
    updated_at = NOW()
  WHERE id = p_environment_id;

  INSERT INTO resource_allocations (run_id, environment_id, worker_pool_id, workers_allocated)
  VALUES (p_run_id, p_environment_id, p_worker_pool_id, p_worker_count)
  ON CONFLICT (run_id) DO UPDATE SET
    workers_allocated = resource_allocations.workers_allocated + p_worker_count,
    allocated_at = NOW()
  RETURNING id INTO v_allocation_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'workers_allocated', p_worker_count,
    'environment_allocated', v_env.allocated + p_worker_count,
    'environment_capacity', v_env.capacity
  );
END;
$$;

-- ============================================================
-- Function 4: deallocate_workers
-- ============================================================
CREATE OR REPLACE FUNCTION deallocate_workers(
  p_run_id UUID,
  p_worker_count INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
  v_to_release INTEGER;
BEGIN
  SELECT * INTO v_allocation
  FROM resource_allocations
  WHERE run_id = p_run_id AND released_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No active allocation found for this run');
  END IF;

  v_to_release := COALESCE(p_worker_count, v_allocation.workers_allocated);
  v_to_release := LEAST(v_to_release, v_allocation.workers_allocated);

  UPDATE test_environments SET
    allocated = GREATEST(0, allocated - v_to_release),
    updated_at = NOW()
  WHERE id = v_allocation.environment_id;

  IF v_allocation.worker_pool_id IS NOT NULL THEN
    UPDATE worker_pools SET
      available_workers = available_workers + v_to_release,
      assigned_workers = GREATEST(0, assigned_workers - v_to_release),
      updated_at = NOW()
    WHERE id = v_allocation.worker_pool_id;
  END IF;

  IF v_to_release >= v_allocation.workers_allocated THEN
    UPDATE resource_allocations SET
      workers_allocated = 0,
      released_at = NOW()
    WHERE id = v_allocation.id;
  ELSE
    UPDATE resource_allocations SET
      workers_allocated = workers_allocated - v_to_release
    WHERE id = v_allocation.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'workers_released', v_to_release
  );
END;
$$;

-- ============================================================
-- Function 5: get_worker_pools
-- ============================================================
CREATE OR REPLACE FUNCTION get_worker_pools(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pools JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'total_workers', p.total_workers,
        'available_workers', p.available_workers,
        'assigned_workers', p.assigned_workers,
        'utilization_percentage', ROUND((p.assigned_workers::DECIMAL / NULLIF(p.total_workers, 0)) * 100, 1),
        'priority', p.priority,
        'is_default', p.is_default
      ) ORDER BY p.priority DESC, p.name
    ),
    '[]'::jsonb
  ) INTO v_pools
  FROM worker_pools p
  WHERE p.project_id = p_project_id;

  RETURN v_pools;
END;
$$;

-- ============================================================
-- Function 6: reassign_workers
-- ============================================================
CREATE OR REPLACE FUNCTION reassign_workers(
  p_from_pool_id UUID,
  p_to_pool_id UUID,
  p_worker_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_pool RECORD;
  v_to_pool RECORD;
BEGIN
  SELECT * INTO v_from_pool
  FROM worker_pools WHERE id = p_from_pool_id FOR UPDATE;

  SELECT * INTO v_to_pool
  FROM worker_pools WHERE id = p_to_pool_id FOR UPDATE;

  IF v_from_pool IS NULL OR v_to_pool IS NULL THEN
    RETURN jsonb_build_object('error', 'Pool not found');
  END IF;

  IF v_from_pool.available_workers < p_worker_count THEN
    RETURN jsonb_build_object('error', 'Insufficient available workers in source pool');
  END IF;

  UPDATE worker_pools SET
    total_workers = total_workers - p_worker_count,
    available_workers = available_workers - p_worker_count,
    updated_at = NOW()
  WHERE id = p_from_pool_id;

  UPDATE worker_pools SET
    total_workers = total_workers + p_worker_count,
    available_workers = available_workers + p_worker_count,
    updated_at = NOW()
  WHERE id = p_to_pool_id;

  RETURN jsonb_build_object(
    'success', true,
    'workers_moved', p_worker_count
  );
END;
$$;

-- ============================================================
-- Function 7: get_active_allocations
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_allocations(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocations JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ra.id,
        'run', jsonb_build_object(
          'id', r.id,
          'run_number', r.run_number,
          'name', r.name,
          'status', r.status,
          'progress', (
            SELECT ROUND(
              (COUNT(*) FILTER (WHERE result_status IS NOT NULL)::DECIMAL / 
               NULLIF(COUNT(*), 0)) * 100, 1
            )
            FROM test_execution_results
            WHERE run_id = r.id
          )
        ),
        'environment', jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'status', e.status
        ),
        'workers_allocated', ra.workers_allocated,
        'allocated_at', ra.allocated_at,
        'pool', CASE WHEN wp.id IS NOT NULL THEN jsonb_build_object(
          'id', wp.id,
          'name', wp.name
        ) ELSE NULL END
      ) ORDER BY ra.allocated_at DESC
    ),
    '[]'::jsonb
  ) INTO v_allocations
  FROM resource_allocations ra
  JOIN test_execution_runs r ON ra.run_id = r.id
  JOIN test_environments e ON ra.environment_id = e.id
  LEFT JOIN worker_pools wp ON ra.worker_pool_id = wp.id
  WHERE r.project_id = p_project_id
    AND r.status IN ('running', 'paused')
    AND ra.released_at IS NULL;

  RETURN v_allocations;
END;
$$;