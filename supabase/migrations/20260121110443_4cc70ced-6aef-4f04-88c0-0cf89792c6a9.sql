-- ============================================================
-- MODULE 3C-4: BATCH DELETE
-- Database Schema & Functions
-- ============================================================

-- Delete Status Enum (only if not exists - batch_update already created a similar one)
DO $$ BEGIN
  CREATE TYPE batch_delete_status AS ENUM ('pending', 'validating', 'executing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delete Type Enum
DO $$ BEGIN
  CREATE TYPE delete_type AS ENUM ('soft', 'permanent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Batch Delete Jobs Table
CREATE TABLE IF NOT EXISTS batch_delete_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status batch_delete_status DEFAULT 'pending',
  delete_type delete_type NOT NULL DEFAULT 'soft',
  test_case_ids JSONB NOT NULL DEFAULT '[]',
  total_records INTEGER DEFAULT 0,
  deleted_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_delete_project ON batch_delete_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_delete_status ON batch_delete_jobs(status);

-- Deleted Items Log (for restore support)
CREATE TABLE IF NOT EXISTS deleted_items_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES batch_delete_jobs(id) ON DELETE SET NULL,
  test_case_id UUID NOT NULL,
  test_case_data JSONB NOT NULL,
  delete_type delete_type NOT NULL,
  deleted_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  restored_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_items_test ON deleted_items_log(test_case_id);
CREATE INDEX IF NOT EXISTS idx_deleted_items_expires ON deleted_items_log(expires_at) WHERE restored_at IS NULL;

-- Enable RLS
ALTER TABLE batch_delete_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_items_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_delete_jobs using tm_user_has_access
CREATE POLICY "Users can view delete jobs in their projects"
  ON batch_delete_jobs FOR SELECT
  USING (public.tm_user_has_access(auth.uid(), project_id));

CREATE POLICY "Users can create delete jobs in their projects"
  ON batch_delete_jobs FOR INSERT
  WITH CHECK (public.tm_user_has_access(auth.uid(), project_id));

CREATE POLICY "Users can update delete jobs in their projects"
  ON batch_delete_jobs FOR UPDATE
  USING (public.tm_user_has_access(auth.uid(), project_id));

-- RLS Policies for deleted_items_log
CREATE POLICY "Users can view deleted items"
  ON deleted_items_log FOR SELECT
  USING (
    job_id IS NULL OR 
    job_id IN (
      SELECT id FROM batch_delete_jobs 
      WHERE public.tm_user_has_access(auth.uid(), project_id)
    )
  );

CREATE POLICY "System can insert deleted items"
  ON deleted_items_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update deleted items"
  ON deleted_items_log FOR UPDATE
  USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE batch_delete_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE deleted_items_log;

-- ============================================================
-- Function 1: create_batch_delete_job
-- ============================================================
CREATE OR REPLACE FUNCTION create_batch_delete_job(
  p_project_id UUID,
  p_test_case_ids JSONB,
  p_delete_type delete_type DEFAULT 'soft'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_total INTEGER;
  v_actor UUID := auth.uid();
BEGIN
  v_total := jsonb_array_length(p_test_case_ids);

  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', 'No test cases selected');
  END IF;

  -- Create job
  INSERT INTO batch_delete_jobs (
    project_id, test_case_ids, delete_type, total_records, created_by
  ) VALUES (
    p_project_id, p_test_case_ids, p_delete_type, v_total, v_actor
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'total_records', v_total
  );
END;
$$;

-- ============================================================
-- Function 2: get_delete_dependencies
-- ============================================================
CREATE OR REPLACE FUNCTION get_delete_dependencies(p_test_case_ids JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_count INTEGER := 0;
  v_step_count INTEGER := 0;
  v_defect_count INTEGER := 0;
BEGIN
  -- Count test runs (if test_execution_results exists)
  BEGIN
    SELECT COUNT(*) INTO v_run_count
    FROM test_execution_results
    WHERE test_case_id = ANY(
      SELECT (jsonb_array_elements_text(p_test_case_ids))::UUID
    );
  EXCEPTION WHEN undefined_table THEN
    v_run_count := 0;
  END;

  -- Count test steps
  BEGIN
    SELECT COUNT(*) INTO v_step_count
    FROM test_steps
    WHERE test_case_id = ANY(
      SELECT (jsonb_array_elements_text(p_test_case_ids))::UUID
    );
  EXCEPTION WHEN undefined_table THEN
    v_step_count := 0;
  END;

  -- Count linked defects (if table exists)
  BEGIN
    SELECT COUNT(*) INTO v_defect_count
    FROM test_case_defects
    WHERE test_case_id = ANY(
      SELECT (jsonb_array_elements_text(p_test_case_ids))::UUID
    );
  EXCEPTION WHEN undefined_table THEN
    v_defect_count := 0;
  END;

  RETURN jsonb_build_object(
    'test_runs', v_run_count,
    'test_steps', v_step_count,
    'linked_defects', v_defect_count,
    'total_affected', v_run_count + v_step_count + v_defect_count
  );
END;
$$;

-- ============================================================
-- Function 3: execute_soft_delete
-- ============================================================
CREATE OR REPLACE FUNCTION execute_soft_delete(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_tc_id UUID;
  v_deleted INTEGER := 0;
  v_failed INTEGER := 0;
  v_actor UUID := auth.uid();
  v_tc_data JSONB;
BEGIN
  -- Get job
  SELECT * INTO v_job
  FROM batch_delete_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Update status
  UPDATE batch_delete_jobs SET
    status = 'executing',
    started_at = NOW()
  WHERE id = p_job_id;

  -- Process each test case
  FOR v_tc_id IN 
    SELECT (jsonb_array_elements_text(v_job.test_case_ids))::UUID
  LOOP
    BEGIN
      -- Get test case data
      SELECT to_jsonb(tc.*) INTO v_tc_data
      FROM test_cases tc
      WHERE tc.id = v_tc_id AND tc.deleted_at IS NULL;

      IF v_tc_data IS NOT NULL THEN
        -- Store for potential restore
        INSERT INTO deleted_items_log (
          job_id, test_case_id, test_case_data, delete_type, deleted_by, expires_at
        ) VALUES (
          p_job_id, v_tc_id, v_tc_data, 'soft', v_actor, NOW() + INTERVAL '30 days'
        );

        -- Soft delete
        UPDATE test_cases SET
          deleted_at = NOW()
        WHERE id = v_tc_id;

        v_deleted := v_deleted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  -- Update job status
  UPDATE batch_delete_jobs SET
    status = 'completed',
    deleted_records = v_deleted,
    failed_records = v_failed,
    completed_at = NOW()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted,
    'failed', v_failed,
    'can_restore', true,
    'expires_in_days', 30
  );
END;
$$;

-- ============================================================
-- Function 4: execute_permanent_delete
-- ============================================================
CREATE OR REPLACE FUNCTION execute_permanent_delete(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_tc_id UUID;
  v_deleted INTEGER := 0;
  v_failed INTEGER := 0;
  v_actor UUID := auth.uid();
  v_tc_data JSONB;
BEGIN
  -- Get job
  SELECT * INTO v_job
  FROM batch_delete_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Update status
  UPDATE batch_delete_jobs SET
    status = 'executing',
    started_at = NOW()
  WHERE id = p_job_id;

  -- Process each test case
  FOR v_tc_id IN 
    SELECT (jsonb_array_elements_text(v_job.test_case_ids))::UUID
  LOOP
    BEGIN
      -- Get test case data before deletion
      SELECT to_jsonb(tc.*) INTO v_tc_data
      FROM test_cases tc
      WHERE tc.id = v_tc_id;

      IF v_tc_data IS NOT NULL THEN
        -- Store deletion record (for audit)
        INSERT INTO deleted_items_log (
          job_id, test_case_id, test_case_data, delete_type, deleted_by
        ) VALUES (
          p_job_id, v_tc_id, v_tc_data, 'permanent', v_actor
        );

        -- Delete related data
        DELETE FROM test_steps WHERE test_case_id = v_tc_id;
        
        -- Delete test case
        DELETE FROM test_cases WHERE id = v_tc_id;

        v_deleted := v_deleted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  -- Update job status
  UPDATE batch_delete_jobs SET
    status = 'completed',
    deleted_records = v_deleted,
    failed_records = v_failed,
    completed_at = NOW()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted,
    'failed', v_failed,
    'can_restore', false
  );
END;
$$;

-- ============================================================
-- Function 5: get_batch_delete_status
-- ============================================================
CREATE OR REPLACE FUNCTION get_batch_delete_status(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_progress INTEGER;
BEGIN
  SELECT * INTO v_job
  FROM batch_delete_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Calculate progress
  IF v_job.status = 'completed' THEN
    v_progress := 100;
  ELSIF v_job.status = 'executing' AND v_job.total_records > 0 THEN
    v_progress := ROUND(((v_job.deleted_records + v_job.failed_records)::DECIMAL / v_job.total_records) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'job_id', v_job.id,
    'status', v_job.status,
    'progress', v_progress,
    'delete_type', v_job.delete_type,
    'total_records', v_job.total_records,
    'deleted_records', v_job.deleted_records,
    'failed_records', v_job.failed_records,
    'error_message', v_job.error_message
  );
END;
$$;

-- ============================================================
-- Function 6: restore_deleted_items
-- ============================================================
CREATE OR REPLACE FUNCTION restore_deleted_items(p_test_case_ids JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_restored INTEGER := 0;
  v_actor UUID := auth.uid();
BEGIN
  FOR v_item IN 
    SELECT * FROM deleted_items_log
    WHERE test_case_id = ANY(
      SELECT (jsonb_array_elements_text(p_test_case_ids))::UUID
    )
    AND delete_type = 'soft'
    AND restored_at IS NULL
    AND expires_at > NOW()
  LOOP
    -- Restore test case
    UPDATE test_cases SET
      deleted_at = NULL
    WHERE id = v_item.test_case_id;

    -- Mark as restored
    UPDATE deleted_items_log SET
      restored_at = NOW(),
      restored_by = v_actor
    WHERE id = v_item.id;

    v_restored := v_restored + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'restored', v_restored
  );
END;
$$;

-- ============================================================
-- Function 7: get_deleted_items
-- Returns soft-deleted items for trash view
-- ============================================================
CREATE OR REPLACE FUNCTION get_deleted_items(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', dil.id,
        'test_case_id', dil.test_case_id,
        'case_number', dil.test_case_data->>'case_number',
        'title', dil.test_case_data->>'title',
        'deleted_at', dil.deleted_at,
        'expires_at', dil.expires_at,
        'days_remaining', EXTRACT(DAY FROM (dil.expires_at - NOW()))::INTEGER
      )
    ), '[]'::jsonb)
    FROM deleted_items_log dil
    JOIN batch_delete_jobs bdj ON dil.job_id = bdj.id
    WHERE bdj.project_id = p_project_id
      AND dil.delete_type = 'soft'
      AND dil.restored_at IS NULL
      AND dil.expires_at > NOW()
    ORDER BY dil.deleted_at DESC
  );
END;
$$;