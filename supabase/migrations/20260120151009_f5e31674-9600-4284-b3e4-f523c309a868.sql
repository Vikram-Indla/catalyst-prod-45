-- ============================================================
-- MODULE 3A-3: RESULT RECORDING & EVIDENCE
-- Database Schema and Functions (aligned with existing schema)
-- ============================================================

-- Evidence Storage Table (references existing test_execution_step_results)
CREATE TABLE IF NOT EXISTS test_step_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_result_id UUID NOT NULL REFERENCES test_execution_step_results(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('screenshot', 'video', 'file', 'log')),
  filename TEXT NOT NULL,
  original_filename TEXT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'evidence',
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  thumbnail_path TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_step_evidence_result ON test_step_evidence(step_result_id);
CREATE INDEX IF NOT EXISTS idx_step_evidence_type ON test_step_evidence(type);

-- Enable RLS
ALTER TABLE test_step_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view evidence" 
  ON test_step_evidence FOR SELECT 
  USING (deleted_at IS NULL);

CREATE POLICY "Users can insert evidence" 
  ON test_step_evidence FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their evidence" 
  ON test_step_evidence FOR UPDATE 
  USING (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their evidence" 
  ON test_step_evidence FOR DELETE 
  USING (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE test_step_evidence;

-- ============================================================
-- Storage Bucket for Evidence
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can view evidence files"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload evidence files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete evidence files"
ON storage.objects FOR DELETE
USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

-- ============================================================
-- Function 1: save_step_result_with_evidence
-- Uses test_execution_step_results and test_steps tables
-- ============================================================
CREATE OR REPLACE FUNCTION save_step_result_with_evidence(
  p_execution_id UUID,
  p_step_id UUID,
  p_actual_result TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_result_id UUID;
  v_step_order INTEGER;
  v_step_description TEXT;
  v_expected_result TEXT;
BEGIN
  -- Get step details
  SELECT step_order, action, expected_result INTO v_step_order, v_step_description, v_expected_result
  FROM test_steps
  WHERE id = p_step_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Step not found');
  END IF;

  -- Upsert step result
  INSERT INTO test_execution_step_results (
    id,
    execution_id,
    step_order,
    step_description,
    expected_result,
    actual_result,
    comments,
    status
  ) VALUES (
    gen_random_uuid(),
    p_execution_id,
    v_step_order,
    v_step_description,
    v_expected_result,
    NULLIF(TRIM(COALESCE(p_actual_result, '')), ''),
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    'pending'
  )
  ON CONFLICT (execution_id, step_order) DO UPDATE SET
    actual_result = COALESCE(EXCLUDED.actual_result, test_execution_step_results.actual_result),
    comments = COALESCE(EXCLUDED.comments, test_execution_step_results.comments)
  RETURNING id INTO v_step_result_id;

  RETURN jsonb_build_object(
    'success', true,
    'step_result_id', v_step_result_id
  );
END;
$$;

-- ============================================================
-- Function 2: upload_evidence
-- ============================================================
CREATE OR REPLACE FUNCTION upload_evidence(
  p_step_result_id UUID,
  p_type TEXT,
  p_filename TEXT,
  p_original_filename TEXT,
  p_storage_path TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT DEFAULT NULL,
  p_width INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_thumbnail_path TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_id UUID;
  v_actor UUID := auth.uid();
  v_max_size INTEGER := 10485760;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM test_execution_step_results WHERE id = p_step_result_id) THEN
    RETURN jsonb_build_object('error', 'Step result not found');
  END IF;

  IF p_type NOT IN ('screenshot', 'video', 'file', 'log') THEN
    RETURN jsonb_build_object('error', 'Invalid evidence type');
  END IF;

  IF p_file_size > v_max_size THEN
    RETURN jsonb_build_object('error', 'File too large. Maximum size is 10MB');
  END IF;

  IF TRIM(COALESCE(p_filename, '')) = '' THEN
    RETURN jsonb_build_object('error', 'Filename is required');
  END IF;

  INSERT INTO test_step_evidence (
    step_result_id,
    type,
    filename,
    original_filename,
    storage_path,
    file_size,
    mime_type,
    width,
    height,
    thumbnail_path,
    metadata,
    uploaded_by
  ) VALUES (
    p_step_result_id,
    p_type,
    TRIM(p_filename),
    TRIM(p_original_filename),
    p_storage_path,
    p_file_size,
    p_mime_type,
    p_width,
    p_height,
    p_thumbnail_path,
    COALESCE(p_metadata, '{}'),
    v_actor
  )
  RETURNING id INTO v_evidence_id;

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', v_evidence_id,
    'filename', p_filename
  );
END;
$$;

-- ============================================================
-- Function 3: delete_evidence
-- ============================================================
CREATE OR REPLACE FUNCTION delete_evidence(p_evidence_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence RECORD;
BEGIN
  SELECT * INTO v_evidence
  FROM test_step_evidence
  WHERE id = p_evidence_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Evidence not found');
  END IF;

  UPDATE test_step_evidence
  SET deleted_at = NOW()
  WHERE id = p_evidence_id;

  RETURN jsonb_build_object(
    'success', true,
    'storage_path', v_evidence.storage_path,
    'thumbnail_path', v_evidence.thumbnail_path
  );
END;
$$;

-- ============================================================
-- Function 4: get_step_evidence
-- ============================================================
CREATE OR REPLACE FUNCTION get_step_evidence(p_step_result_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'type', e.type,
        'filename', e.filename,
        'original_filename', e.original_filename,
        'storage_path', e.storage_path,
        'file_size', e.file_size,
        'mime_type', e.mime_type,
        'width', e.width,
        'height', e.height,
        'thumbnail_path', e.thumbnail_path,
        'metadata', e.metadata,
        'uploaded_by', jsonb_build_object(
          'id', p.id,
          'name', p.full_name
        ),
        'created_at', e.created_at
      ) ORDER BY e.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_evidence
  FROM test_step_evidence e
  LEFT JOIN profiles p ON e.uploaded_by = p.id
  WHERE e.step_result_id = p_step_result_id
    AND e.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'evidence', v_evidence,
    'count', jsonb_array_length(v_evidence)
  );
END;
$$;

-- ============================================================
-- Function 5: update_actual_result
-- ============================================================
CREATE OR REPLACE FUNCTION update_actual_result(
  p_execution_id UUID,
  p_step_order INTEGER,
  p_actual_result TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_result_id UUID;
BEGIN
  UPDATE test_execution_step_results
  SET actual_result = NULLIF(TRIM(COALESCE(p_actual_result, '')), '')
  WHERE execution_id = p_execution_id AND step_order = p_step_order
  RETURNING id INTO v_step_result_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Step result not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step_result_id', v_step_result_id
  );
END;
$$;