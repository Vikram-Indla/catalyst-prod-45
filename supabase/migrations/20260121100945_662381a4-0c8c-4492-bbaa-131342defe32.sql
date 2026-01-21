-- ============================================================
-- MODULE 3C-2: BATCH EXPORT
-- Database Schema and Functions
-- ============================================================

-- Export Status Enum
DO $$ BEGIN
  CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Export Format Enum
DO $$ BEGIN
  CREATE TYPE export_format AS ENUM ('csv', 'xlsx', 'json', 'pdf');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format export_format NOT NULL,
  status export_status DEFAULT 'pending',
  file_name TEXT,
  file_size INTEGER,
  file_url TEXT,
  total_records INTEGER DEFAULT 0,
  exported_records INTEGER DEFAULT 0,
  fields JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  test_case_ids JSONB DEFAULT '[]',
  options JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_project ON export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON export_jobs(created_by);

-- Enable RLS
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own export jobs"
ON export_jobs FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create export jobs"
ON export_jobs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own export jobs"
ON export_jobs FOR UPDATE
USING (auth.uid() = created_by);

-- ============================================================
-- Function 1: create_export_job
-- ============================================================
CREATE OR REPLACE FUNCTION create_export_job(
  p_project_id UUID,
  p_format export_format,
  p_fields JSONB,
  p_filters JSONB,
  p_test_case_ids JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
  v_total INTEGER;
  v_actor UUID := auth.uid();
BEGIN
  -- Count records to export
  IF jsonb_array_length(COALESCE(p_test_case_ids, '[]'::jsonb)) > 0 THEN
    v_total := jsonb_array_length(p_test_case_ids);
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM test_cases
    WHERE project_id = p_project_id AND deleted_at IS NULL;
  END IF;

  -- Create job
  INSERT INTO export_jobs (
    project_id, format, fields, filters, test_case_ids, total_records, created_by
  ) VALUES (
    p_project_id, p_format, p_fields, COALESCE(p_filters, '{}'::jsonb), 
    COALESCE(p_test_case_ids, '[]'::jsonb), v_total, v_actor
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
-- Function 2: get_export_data
-- ============================================================
CREATE OR REPLACE FUNCTION get_export_data(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_data JSONB;
BEGIN
  -- Get job
  SELECT * INTO v_job
  FROM export_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Export job not found');
  END IF;

  -- Update status
  UPDATE export_jobs SET
    status = 'processing',
    started_at = NOW()
  WHERE id = p_job_id;

  -- Get test case data
  IF jsonb_array_length(COALESCE(v_job.test_case_ids, '[]'::jsonb)) > 0 THEN
    SELECT COALESCE(jsonb_agg(row_to_json(tc)), '[]'::jsonb) INTO v_data
    FROM test_cases tc
    WHERE tc.project_id = v_job.project_id 
      AND tc.deleted_at IS NULL
      AND tc.id IN (SELECT jsonb_array_elements_text(v_job.test_case_ids)::UUID);
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(tc)), '[]'::jsonb) INTO v_data
    FROM test_cases tc
    WHERE tc.project_id = v_job.project_id 
      AND tc.deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_data,
    'fields', v_job.fields,
    'format', v_job.format
  );
END;
$$;

-- ============================================================
-- Function 3: complete_export_job
-- ============================================================
CREATE OR REPLACE FUNCTION complete_export_job(
  p_job_id UUID,
  p_file_name TEXT,
  p_file_size INTEGER,
  p_file_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Get and update job
  UPDATE export_jobs SET
    status = 'completed',
    file_name = p_file_name,
    file_size = p_file_size,
    file_url = p_file_url,
    exported_records = total_records,
    completed_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days'
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Export job not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'file_name', p_file_name,
    'file_size', p_file_size,
    'file_url', p_file_url,
    'exported_records', v_job.total_records
  );
END;
$$;

-- ============================================================
-- Function 4: get_export_status
-- ============================================================
CREATE OR REPLACE FUNCTION get_export_status(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_progress INTEGER;
BEGIN
  SELECT * INTO v_job
  FROM export_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Export job not found');
  END IF;

  -- Calculate progress
  IF v_job.status = 'completed' THEN
    v_progress := 100;
  ELSIF v_job.status = 'processing' AND v_job.total_records > 0 THEN
    v_progress := ROUND((v_job.exported_records::DECIMAL / v_job.total_records) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'job_id', v_job.id,
    'status', v_job.status,
    'progress', v_progress,
    'format', v_job.format,
    'total_records', v_job.total_records,
    'exported_records', v_job.exported_records,
    'file_name', v_job.file_name,
    'file_size', v_job.file_size,
    'file_url', v_job.file_url,
    'error_message', v_job.error_message
  );
END;
$$;

-- ============================================================
-- Function 5: get_export_history
-- ============================================================
CREATE OR REPLACE FUNCTION get_export_history(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exports JSONB;
  v_actor UUID := auth.uid();
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'format', format,
        'status', status,
        'file_name', file_name,
        'file_size', file_size,
        'file_url', file_url,
        'total_records', total_records,
        'created_at', created_at,
        'completed_at', completed_at,
        'expires_at', expires_at,
        'is_expired', (expires_at < NOW())
      ) ORDER BY created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_exports
  FROM export_jobs
  WHERE project_id = p_project_id
    AND created_by = v_actor
  LIMIT p_limit;

  RETURN v_exports;
END;
$$;

-- ============================================================
-- Function 6: fail_export_job
-- ============================================================
CREATE OR REPLACE FUNCTION fail_export_job(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE export_jobs SET
    status = 'failed',
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id
  );
END;
$$;