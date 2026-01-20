-- ============================================================
-- Module 3A-1: Execution Session Manager
-- Extends test_execution_runs and creates test_execution_results
-- ============================================================

-- Add new columns to existing test_execution_runs table
ALTER TABLE public.test_execution_runs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'staging',
  ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_testers UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add constraints
ALTER TABLE public.test_execution_runs
  DROP CONSTRAINT IF EXISTS check_environment,
  ADD CONSTRAINT check_environment CHECK (environment IN ('development', 'staging', 'production', 'custom'));

ALTER TABLE public.test_execution_runs
  DROP CONSTRAINT IF EXISTS check_run_status,
  ADD CONSTRAINT check_run_status CHECK (status IN ('draft', 'in_progress', 'paused', 'completed', 'aborted'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_execution_runs_project ON test_execution_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_execution_runs_status ON test_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_execution_runs_created_by ON test_execution_runs(created_by);

-- ============================================================
-- Test Execution Results Table (individual case results)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES test_execution_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  execution_order INTEGER NOT NULL DEFAULT 0,
  result_status TEXT CHECK (result_status IS NULL OR result_status IN ('passed', 'failed', 'blocked', 'skipped', 'in_progress')),
  assigned_tester UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  actual_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_execution_results_run ON test_execution_results(run_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_status ON test_execution_results(result_status);

-- Enable RLS
ALTER TABLE test_execution_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_execution_results
CREATE POLICY "Users can view execution results"
  ON test_execution_results FOR SELECT
  USING (true);

CREATE POLICY "Users can insert execution results"
  ON test_execution_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update execution results"
  ON test_execution_results FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete execution results"
  ON test_execution_results FOR DELETE
  USING (true);

-- Enable realtime for execution results
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_execution_results;

-- ============================================================
-- Execution Run Audit Log Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.execution_run_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'test_execution_run',
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_audit_entity ON execution_run_audit_logs(entity_id);

-- Enable RLS
ALTER TABLE execution_run_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs"
  ON execution_run_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert audit logs"
  ON execution_run_audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Function: create_execution_run
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_execution_run(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'staging',
  p_configuration JSONB DEFAULT '{}',
  p_scheduled_start TIMESTAMPTZ DEFAULT NULL,
  p_assigned_testers UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
  v_run_number INTEGER;
  v_created_by UUID := auth.uid();
BEGIN
  -- Validate project exists
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  -- Validate name
  IF TRIM(COALESCE(p_name, '')) = '' THEN
    RETURN jsonb_build_object('error', 'Run name is required');
  END IF;

  -- Validate environment
  IF p_environment NOT IN ('development', 'staging', 'production', 'custom') THEN
    RETURN jsonb_build_object('error', 'Invalid environment');
  END IF;

  -- Generate run number (auto-increment per project)
  SELECT COALESCE(MAX(run_number), 0) + 1 INTO v_run_number
  FROM test_execution_runs
  WHERE project_id = p_project_id;

  -- Insert new run
  INSERT INTO test_execution_runs (
    project_id,
    run_number,
    name,
    description,
    environment,
    configuration,
    status,
    scheduled_start,
    created_by,
    assigned_testers,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    v_run_number,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_environment,
    COALESCE(p_configuration, '{}'),
    'draft',
    p_scheduled_start,
    v_created_by,
    COALESCE(p_assigned_testers, '{}'),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_run_id;

  -- Audit log
  INSERT INTO execution_run_audit_logs (entity_type, entity_id, action, actor_id, changes)
  VALUES ('test_execution_run', v_run_id, 'create', v_created_by, 
    jsonb_build_object(
      'name', p_name,
      'environment', p_environment,
      'run_number', v_run_number
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'run_number', v_run_number
  );
END;
$$;

-- ============================================================
-- Function: get_execution_run
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_execution_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run RECORD;
  v_progress RECORD;
  v_testers JSONB;
BEGIN
  -- Get run with project and creator info
  SELECT 
    r.*,
    p.name as project_name,
    u.full_name as creator_name,
    u.avatar_url as creator_avatar
  INTO v_run
  FROM test_execution_runs r
  LEFT JOIN projects p ON r.project_id = p.id
  LEFT JOIN profiles u ON r.created_by = u.id
  WHERE r.id = p_run_id AND r.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Calculate progress
  SELECT 
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE result_status = 'passed') as passed,
    COUNT(*) FILTER (WHERE result_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE result_status = 'blocked') as blocked,
    COUNT(*) FILTER (WHERE result_status = 'skipped') as skipped,
    COUNT(*) FILTER (WHERE result_status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE result_status IS NULL) as not_run
  INTO v_progress
  FROM test_execution_results
  WHERE run_id = p_run_id;

  -- Get assigned testers with details
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'name', u.full_name,
        'avatar', u.avatar_url
      )
    ),
    '[]'::jsonb
  ) INTO v_testers
  FROM profiles u
  WHERE u.id = ANY(v_run.assigned_testers);

  RETURN jsonb_build_object(
    'id', v_run.id,
    'project_id', v_run.project_id,
    'project_name', v_run.project_name,
    'run_number', v_run.run_number,
    'name', COALESCE(v_run.name, v_run.run_name),
    'description', v_run.description,
    'environment', COALESCE(v_run.environment, 'staging'),
    'configuration', COALESCE(v_run.configuration, '{}'::jsonb),
    'status', COALESCE(v_run.status, 'draft'),
    'scheduled_start', v_run.scheduled_start,
    'started_at', v_run.started_at,
    'completed_at', v_run.completed_at,
    'created_by', jsonb_build_object(
      'id', v_run.created_by,
      'name', v_run.creator_name,
      'avatar', v_run.creator_avatar
    ),
    'assigned_testers', v_testers,
    'progress', jsonb_build_object(
      'total_cases', COALESCE(v_progress.total_cases, 0),
      'passed', COALESCE(v_progress.passed, 0),
      'failed', COALESCE(v_progress.failed, 0),
      'blocked', COALESCE(v_progress.blocked, 0),
      'skipped', COALESCE(v_progress.skipped, 0),
      'in_progress', COALESCE(v_progress.in_progress, 0),
      'not_run', COALESCE(v_progress.not_run, 0),
      'completion_percentage', CASE 
        WHEN COALESCE(v_progress.total_cases, 0) > 0 
        THEN ROUND(((v_progress.total_cases - v_progress.not_run)::NUMERIC / v_progress.total_cases) * 100, 1)
        ELSE 0 
      END,
      'pass_rate', CASE 
        WHEN (COALESCE(v_progress.passed, 0) + COALESCE(v_progress.failed, 0) + COALESCE(v_progress.blocked, 0) + COALESCE(v_progress.skipped, 0)) > 0
        THEN ROUND((v_progress.passed::NUMERIC / (v_progress.passed + v_progress.failed + v_progress.blocked + v_progress.skipped)) * 100, 1)
        ELSE 0 
      END
    ),
    'created_at', v_run.created_at,
    'updated_at', v_run.updated_at
  );
END;
$$;

-- ============================================================
-- Function: update_execution_run
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_execution_run(
  p_run_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT NULL,
  p_configuration JSONB DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_assigned_testers UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_changes JSONB := '{}';
  v_actor UUID := auth.uid();
BEGIN
  -- Get current run
  SELECT COALESCE(status, 'draft') INTO v_old_status
  FROM test_execution_runs
  WHERE id = p_run_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Validate status transition
  IF p_status IS NOT NULL AND p_status != v_old_status THEN
    IF NOT (
      (v_old_status = 'draft' AND p_status IN ('in_progress', 'aborted')) OR
      (v_old_status = 'in_progress' AND p_status IN ('paused', 'completed', 'aborted')) OR
      (v_old_status = 'paused' AND p_status IN ('in_progress', 'completed', 'aborted'))
    ) THEN
      RETURN jsonb_build_object('error', 'Invalid status transition from ' || v_old_status || ' to ' || p_status);
    END IF;
    
    v_changes := v_changes || jsonb_build_object(
      'status', jsonb_build_object('from', v_old_status, 'to', p_status)
    );
  END IF;

  -- Cannot modify completed/aborted runs (except for minor fields)
  IF v_old_status IN ('completed', 'aborted') AND p_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Cannot modify a ' || v_old_status || ' run');
  END IF;

  -- Update run
  UPDATE test_execution_runs SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    description = COALESCE(p_description, description),
    environment = COALESCE(p_environment, environment),
    configuration = COALESCE(p_configuration, configuration),
    status = COALESCE(p_status, status),
    assigned_testers = COALESCE(p_assigned_testers, assigned_testers),
    started_at = CASE 
      WHEN p_status = 'in_progress' AND started_at IS NULL THEN NOW()
      ELSE started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'aborted') THEN NOW()
      ELSE completed_at 
    END,
    updated_at = NOW()
  WHERE id = p_run_id;

  -- Audit log
  IF v_changes != '{}' THEN
    INSERT INTO execution_run_audit_logs (entity_type, entity_id, action, actor_id, changes)
    VALUES ('test_execution_run', p_run_id, 'update', v_actor, v_changes);
  END IF;

  RETURN jsonb_build_object('success', true, 'run_id', p_run_id);
END;
$$;

-- ============================================================
-- Function: delete_execution_run
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_execution_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_run_name TEXT;
BEGIN
  -- Get run name for audit
  SELECT COALESCE(name, run_name) INTO v_run_name
  FROM test_execution_runs
  WHERE id = p_run_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  -- Soft delete
  UPDATE test_execution_runs 
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_run_id;

  -- Audit log
  INSERT INTO execution_run_audit_logs (entity_type, entity_id, action, actor_id, changes)
  VALUES ('test_execution_run', p_run_id, 'delete', v_actor, 
    jsonb_build_object('name', v_run_name)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- Function: add_test_cases_to_run
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_test_cases_to_run(
  p_run_id UUID,
  p_test_case_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id UUID;
  v_count INTEGER := 0;
  v_execution_order INTEGER;
  v_run_status TEXT;
BEGIN
  -- Validate run exists and is in draft status
  SELECT COALESCE(status, 'draft') INTO v_run_status
  FROM test_execution_runs 
  WHERE id = p_run_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;

  IF v_run_status != 'draft' THEN
    RETURN jsonb_build_object('error', 'Can only add test cases to draft runs');
  END IF;

  -- Get current max order
  SELECT COALESCE(MAX(execution_order), 0) INTO v_execution_order
  FROM test_execution_results WHERE run_id = p_run_id;

  -- Insert execution results for each case
  FOREACH v_case_id IN ARRAY p_test_case_ids
  LOOP
    -- Skip if already in run or case doesn't exist
    IF EXISTS (SELECT 1 FROM test_cases WHERE id = v_case_id AND deleted_at IS NULL) AND
       NOT EXISTS (SELECT 1 FROM test_execution_results WHERE run_id = p_run_id AND test_case_id = v_case_id) 
    THEN
      v_execution_order := v_execution_order + 1;
      
      INSERT INTO test_execution_results (
        run_id, 
        test_case_id, 
        execution_order, 
        result_status
      ) VALUES (
        p_run_id, 
        v_case_id, 
        v_execution_order, 
        NULL
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'added_count', v_count,
    'total_cases', v_execution_order
  );
END;
$$;

-- ============================================================
-- Function: get_run_progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_run_progress(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_cases', COUNT(*),
      'passed', COUNT(*) FILTER (WHERE result_status = 'passed'),
      'failed', COUNT(*) FILTER (WHERE result_status = 'failed'),
      'blocked', COUNT(*) FILTER (WHERE result_status = 'blocked'),
      'skipped', COUNT(*) FILTER (WHERE result_status = 'skipped'),
      'in_progress', COUNT(*) FILTER (WHERE result_status = 'in_progress'),
      'not_run', COUNT(*) FILTER (WHERE result_status IS NULL),
      'completion_percentage', CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND(((COUNT(*) - COUNT(*) FILTER (WHERE result_status IS NULL))::NUMERIC / COUNT(*)) * 100, 1)
        ELSE 0 
      END,
      'pass_rate', CASE 
        WHEN COUNT(*) FILTER (WHERE result_status IN ('passed', 'failed', 'blocked', 'skipped')) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE result_status = 'passed')::NUMERIC / 
          COUNT(*) FILTER (WHERE result_status IN ('passed', 'failed', 'blocked', 'skipped'))) * 100, 1)
        ELSE 0 
      END,
      'avg_execution_time', COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::INTEGER, 
        0
      ),
      'total_execution_time', COALESCE(
        SUM(EXTRACT(EPOCH FROM (completed_at - started_at)))::INTEGER, 
        0
      )
    )
    FROM test_execution_results
    WHERE run_id = p_run_id
  );
END;
$$;