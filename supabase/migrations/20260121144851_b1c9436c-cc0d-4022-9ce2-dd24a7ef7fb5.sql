-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5A-2: RESULT IMPORT & MAPPING - DATABASE
-- ═══════════════════════════════════════════════════════════════════════════

-- Test mappings table
CREATE TABLE IF NOT EXISTS automation_test_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES automation_connectors(id) ON DELETE CASCADE,
  external_test_id TEXT NOT NULL,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connector_id, external_test_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_mappings_connector ON automation_test_mappings(connector_id);
CREATE INDEX IF NOT EXISTS idx_automation_mappings_test_case ON automation_test_mappings(test_case_id);

-- Enable RLS
ALTER TABLE automation_test_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mappings" ON automation_test_mappings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage mappings" ON automation_test_mappings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Import jobs table
CREATE TABLE IF NOT EXISTS automation_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES automation_connectors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source_file_name TEXT,
  source_format TEXT CHECK (source_format IN ('junit', 'testng', 'pytest', 'jest', 'mocha', 'custom')),
  total_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  mapped_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_connector ON automation_import_jobs(connector_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON automation_import_jobs(status);

-- Enable RLS
ALTER TABLE automation_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import jobs" ON automation_import_jobs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create import jobs" ON automation_import_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their import jobs" ON automation_import_jobs
  FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Function: import_automation_results
CREATE OR REPLACE FUNCTION import_automation_results(
  p_connector_id UUID,
  p_results JSONB,
  p_source_file_name TEXT DEFAULT NULL,
  p_source_format TEXT DEFAULT 'junit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_result JSONB;
  v_test_case_id UUID;
  v_imported INTEGER := 0;
  v_mapped INTEGER := 0;
BEGIN
  -- Create import job
  INSERT INTO automation_import_jobs (connector_id, status, source_file_name, source_format, total_count, created_by)
  VALUES (p_connector_id, 'processing', p_source_file_name, p_source_format, jsonb_array_length(p_results), auth.uid())
  RETURNING id INTO v_job_id;

  -- Process each result
  FOR v_result IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    -- Check for existing mapping
    SELECT test_case_id INTO v_test_case_id
    FROM automation_test_mappings
    WHERE connector_id = p_connector_id AND external_test_id = v_result->>'external_test_id';

    -- Insert result
    INSERT INTO automation_results (
      connector_id, test_case_id, external_test_id, external_test_name,
      status, duration_ms, error_message, stack_trace, metadata, run_timestamp
    ) VALUES (
      p_connector_id, v_test_case_id, v_result->>'external_test_id', v_result->>'external_test_name',
      v_result->>'status', (v_result->>'duration_ms')::INTEGER,
      v_result->>'error_message', v_result->>'stack_trace',
      COALESCE(v_result->'metadata', '{}'), COALESCE((v_result->>'run_timestamp')::TIMESTAMPTZ, now())
    );

    v_imported := v_imported + 1;
    IF v_test_case_id IS NOT NULL THEN v_mapped := v_mapped + 1; END IF;
  END LOOP;

  -- Update job
  UPDATE automation_import_jobs SET
    status = 'completed',
    imported_count = v_imported,
    mapped_count = v_mapped,
    completed_at = now()
  WHERE id = v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'imported', v_imported,
    'mapped', v_mapped
  );
END;
$$;

-- Function: map_test_to_case
CREATE OR REPLACE FUNCTION map_test_to_case(
  p_connector_id UUID,
  p_external_test_id TEXT,
  p_test_case_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO automation_test_mappings (connector_id, external_test_id, test_case_id)
  VALUES (p_connector_id, p_external_test_id, p_test_case_id)
  ON CONFLICT (connector_id, external_test_id) DO UPDATE
  SET test_case_id = EXCLUDED.test_case_id;

  -- Update existing results
  UPDATE automation_results
  SET test_case_id = p_test_case_id
  WHERE connector_id = p_connector_id AND external_test_id = p_external_test_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: get_unmapped_tests
CREATE OR REPLACE FUNCTION get_unmapped_tests(p_connector_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'unmapped', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY run_count DESC)
      FROM (
        SELECT jsonb_build_object(
          'external_test_id', ar.external_test_id,
          'external_test_name', MAX(ar.external_test_name),
          'last_status', (array_agg(ar.status ORDER BY ar.imported_at DESC))[1],
          'run_count', COUNT(*)::INTEGER
        ) as row_data, COUNT(*) as run_count
        FROM automation_results ar
        WHERE ar.connector_id = p_connector_id AND ar.test_case_id IS NULL
        GROUP BY ar.external_test_id
      ) sub
    ), '[]'::JSONB)
  );
END;
$$;

-- Function: get_import_history
CREATE OR REPLACE FUNCTION get_import_history(p_connector_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'imports', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', aij.id,
        'status', aij.status,
        'source_file_name', aij.source_file_name,
        'source_format', aij.source_format,
        'total_count', aij.total_count,
        'imported_count', aij.imported_count,
        'mapped_count', aij.mapped_count,
        'error_message', aij.error_message,
        'created_at', aij.created_at,
        'completed_at', aij.completed_at
      ) ORDER BY aij.created_at DESC)
      FROM automation_import_jobs aij
      WHERE aij.connector_id = p_connector_id
      LIMIT p_limit
    ), '[]'::JSONB)
  );
END;
$$;

-- Function: bulk_map_tests
CREATE OR REPLACE FUNCTION bulk_map_tests(
  p_connector_id UUID,
  p_mappings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapping JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_mapping IN SELECT * FROM jsonb_array_elements(p_mappings)
  LOOP
    INSERT INTO automation_test_mappings (connector_id, external_test_id, test_case_id)
    VALUES (p_connector_id, v_mapping->>'external_test_id', (v_mapping->>'test_case_id')::UUID)
    ON CONFLICT (connector_id, external_test_id) DO UPDATE
    SET test_case_id = EXCLUDED.test_case_id;

    -- Update existing results
    UPDATE automation_results
    SET test_case_id = (v_mapping->>'test_case_id')::UUID
    WHERE connector_id = p_connector_id AND external_test_id = v_mapping->>'external_test_id';

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'mapped_count', v_count);
END;
$$;