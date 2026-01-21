-- ============================================================
-- MODULE 3C-3: BATCH UPDATE
-- Database Schema and Functions
-- ============================================================

-- Batch Update Status Enum
DO $$ BEGIN
  CREATE TYPE batch_update_status AS ENUM ('pending', 'validating', 'executing', 'completed', 'failed', 'rolled_back');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Batch Update Jobs Table
CREATE TABLE IF NOT EXISTS batch_update_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status batch_update_status DEFAULT 'pending',
  test_case_ids JSONB NOT NULL DEFAULT '[]',
  field_updates JSONB NOT NULL DEFAULT '{}',
  total_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_update_project ON batch_update_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_update_status ON batch_update_jobs(status);

-- Batch Update Changes (for rollback support)
CREATE TABLE IF NOT EXISTS batch_update_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES batch_update_jobs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  applied BOOLEAN DEFAULT false,
  rolled_back BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_update_changes_job ON batch_update_changes(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_update_changes_test ON batch_update_changes(test_case_id);

-- Enable RLS
ALTER TABLE batch_update_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_update_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_update_jobs
CREATE POLICY "Users can view their own batch update jobs"
ON batch_update_jobs FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create batch update jobs"
ON batch_update_jobs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own batch update jobs"
ON batch_update_jobs FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for batch_update_changes
CREATE POLICY "Users can view changes for their jobs"
ON batch_update_changes FOR SELECT
USING (
  job_id IN (SELECT id FROM batch_update_jobs WHERE created_by = auth.uid())
);

CREATE POLICY "Users can create changes for their jobs"
ON batch_update_changes FOR INSERT
WITH CHECK (
  job_id IN (SELECT id FROM batch_update_jobs WHERE created_by = auth.uid())
);

-- ============================================================
-- Function 1: create_batch_update_job
-- ============================================================
CREATE OR REPLACE FUNCTION create_batch_update_job(
  p_project_id UUID,
  p_test_case_ids JSONB,
  p_field_updates JSONB
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
  v_total := jsonb_array_length(COALESCE(p_test_case_ids, '[]'::jsonb));

  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', 'No test cases selected');
  END IF;

  IF p_field_updates = '{}'::jsonb OR p_field_updates IS NULL THEN
    RETURN jsonb_build_object('error', 'No fields to update');
  END IF;

  -- Create job
  INSERT INTO batch_update_jobs (
    project_id, test_case_ids, field_updates, total_records, created_by
  ) VALUES (
    p_project_id, p_test_case_ids, p_field_updates, v_total, v_actor
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
-- Function 2: validate_batch_update
-- ============================================================
CREATE OR REPLACE FUNCTION validate_batch_update(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_tc RECORD;
  v_field TEXT;
  v_new_value TEXT;
  v_old_value TEXT;
  v_valid_count INTEGER := 0;
BEGIN
  -- Get job
  SELECT * INTO v_job
  FROM batch_update_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Update status
  UPDATE batch_update_jobs SET
    status = 'validating'
  WHERE id = p_job_id;

  -- Process each test case
  FOR v_tc IN 
    SELECT tc.*
    FROM test_cases tc
    WHERE tc.id IN (
      SELECT jsonb_array_elements_text(v_job.test_case_ids)::UUID
    )
    AND tc.deleted_at IS NULL
  LOOP
    -- Process each field update
    FOR v_field, v_new_value IN 
      SELECT key, value::TEXT
      FROM jsonb_each_text(v_job.field_updates)
    LOOP
      -- Get old value dynamically
      BEGIN
        EXECUTE format('SELECT (%L::jsonb->>%L)::TEXT', to_jsonb(v_tc), v_field)
        INTO v_old_value;
      EXCEPTION WHEN OTHERS THEN
        v_old_value := NULL;
      END;

      -- Create change record
      INSERT INTO batch_update_changes (
        job_id, test_case_id, field_name, old_value, new_value
      ) VALUES (
        p_job_id, v_tc.id, v_field, v_old_value, 
        CASE WHEN v_new_value = 'null' THEN NULL ELSE v_new_value END
      );
    END LOOP;

    v_valid_count := v_valid_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'valid_records', v_valid_count
  );
END;
$$;

-- ============================================================
-- Function 3: execute_batch_update
-- ============================================================
CREATE OR REPLACE FUNCTION execute_batch_update(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_tc_id UUID;
  v_updated INTEGER := 0;
  v_failed INTEGER := 0;
  v_update_sql TEXT;
BEGIN
  -- Get job
  SELECT * INTO v_job
  FROM batch_update_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Update status
  UPDATE batch_update_jobs SET
    status = 'executing',
    started_at = NOW()
  WHERE id = p_job_id;

  -- Apply updates per test case
  FOR v_tc_id IN 
    SELECT DISTINCT test_case_id
    FROM batch_update_changes
    WHERE job_id = p_job_id AND NOT applied
  LOOP
    BEGIN
      -- Build dynamic update statement
      SELECT 'UPDATE test_cases SET ' || 
        string_agg(
          format('%I = %L', field_name, new_value),
          ', '
        ) || 
        ', updated_at = NOW() WHERE id = $1'
      INTO v_update_sql
      FROM batch_update_changes
      WHERE job_id = p_job_id
        AND test_case_id = v_tc_id
        AND NOT applied;

      IF v_update_sql IS NOT NULL THEN
        EXECUTE v_update_sql USING v_tc_id;
      END IF;

      -- Mark changes as applied
      UPDATE batch_update_changes SET
        applied = true
      WHERE job_id = p_job_id
        AND test_case_id = v_tc_id;

      v_updated := v_updated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  -- Update job status
  UPDATE batch_update_jobs SET
    status = 'completed',
    updated_records = v_updated,
    failed_records = v_failed,
    completed_at = NOW()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated,
    'failed', v_failed
  );
END;
$$;

-- ============================================================
-- Function 4: get_batch_update_preview
-- ============================================================
CREATE OR REPLACE FUNCTION get_batch_update_preview(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'test_case_id', tc.id,
        'case_number', tc.case_number,
        'title', tc.title,
        'changes', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'field', c.field_name,
              'old_value', c.old_value,
              'new_value', c.new_value
            )
          ), '[]'::jsonb)
          FROM batch_update_changes c
          WHERE c.job_id = p_job_id
          AND c.test_case_id = tc.id
        )
      ) ORDER BY tc.case_number
    ),
    '[]'::jsonb
  ) INTO v_preview
  FROM test_cases tc
  WHERE tc.id IN (
    SELECT DISTINCT test_case_id
    FROM batch_update_changes
    WHERE job_id = p_job_id
  );

  RETURN v_preview;
END;
$$;

-- ============================================================
-- Function 5: get_batch_update_status
-- ============================================================
CREATE OR REPLACE FUNCTION get_batch_update_status(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_progress INTEGER;
  v_total_changes INTEGER;
  v_applied_changes INTEGER;
BEGIN
  SELECT * INTO v_job
  FROM batch_update_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;

  -- Calculate progress
  IF v_job.status = 'completed' THEN
    v_progress := 100;
  ELSIF v_job.status = 'executing' THEN
    SELECT COUNT(DISTINCT test_case_id) INTO v_total_changes
    FROM batch_update_changes
    WHERE job_id = p_job_id;
    
    SELECT COUNT(DISTINCT test_case_id) INTO v_applied_changes
    FROM batch_update_changes
    WHERE job_id = p_job_id AND applied = true;
    
    IF v_total_changes > 0 THEN
      v_progress := ROUND((v_applied_changes::DECIMAL / v_total_changes) * 100);
    ELSE
      v_progress := 0;
    END IF;
  ELSE
    v_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'job_id', v_job.id,
    'status', v_job.status,
    'progress', v_progress,
    'total_records', v_job.total_records,
    'updated_records', v_job.updated_records,
    'failed_records', v_job.failed_records,
    'error_message', v_job.error_message
  );
END;
$$;