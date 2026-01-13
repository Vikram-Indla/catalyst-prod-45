-- ═══════════════════════════════════════════════════════════════════════════
-- EVIDENCE ATTACHMENTS TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS step_result_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_result_id UUID NOT NULL REFERENCES step_results(id) ON DELETE CASCADE,
  execution_result_id UUID NOT NULL REFERENCES execution_results(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 
    'video/mp4', 'video/webm',
    'application/pdf'
  )),
  storage_bucket TEXT NOT NULL DEFAULT 'evidence',
  storage_path TEXT NOT NULL,
  capture_method TEXT NOT NULL CHECK (capture_method IN (
    'screen_capture', 'clipboard_paste', 'file_upload', 'drag_drop', 'api_import'
  )),
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(10,2),
  annotations JSONB DEFAULT '[]'::jsonb,
  ocr_text TEXT,
  ocr_confidence NUMERIC(5,4),
  ocr_processed_at TIMESTAMPTZ,
  ai_analysis JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  ai_has_issues BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Comments
COMMENT ON TABLE step_result_attachments IS 'Evidence files attached to test step results';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attachments_step_result ON step_result_attachments(step_result_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_execution ON step_result_attachments(execution_result_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON step_result_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_ocr_search ON step_result_attachments USING gin(to_tsvector('english', COALESCE(ocr_text, '')));
CREATE INDEX IF NOT EXISTS idx_attachments_ai_issues ON step_result_attachments(ai_has_issues, execution_result_id) WHERE ai_has_issues = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_created ON step_result_attachments(created_at DESC) WHERE deleted_at IS NULL;

-- Trigger
CREATE OR REPLACE FUNCTION update_attachment_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attachment_updated_at ON step_result_attachments;
CREATE TRIGGER trigger_attachment_updated_at BEFORE UPDATE ON step_result_attachments FOR EACH ROW EXECUTE FUNCTION update_attachment_updated_at();

-- RLS for step_result_attachments
ALTER TABLE step_result_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project attachments" ON step_result_attachments;
CREATE POLICY "Users can view project attachments" ON step_result_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM execution_results er
  JOIN test_cases tc ON er.test_case_id = tc.id
  JOIN project_members pm ON tc.project_id = pm.project_id
  WHERE er.id = step_result_attachments.execution_result_id AND pm.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert to own executions" ON step_result_attachments;
CREATE POLICY "Users can insert to own executions" ON step_result_attachments FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (
  SELECT 1 FROM execution_results er
  WHERE er.id = step_result_attachments.execution_result_id AND er.executed_by = auth.uid() AND er.status = 'in_progress'
));

DROP POLICY IF EXISTS "Users can update own attachments" ON step_result_attachments;
CREATE POLICY "Users can update own attachments" ON step_result_attachments FOR UPDATE
USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own attachments" ON step_result_attachments;
CREATE POLICY "Users can delete own attachments" ON step_result_attachments FOR DELETE
USING (uploaded_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop if exist first)
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;
CREATE POLICY "Users can view project files" ON storage.objects FOR SELECT
USING (bucket_id = 'evidence' AND (
  (storage.foldername(name))[1] = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM step_result_attachments sra
    JOIN execution_results er ON sra.execution_result_id = er.id
    JOIN test_cases tc ON er.test_case_id = tc.id
    JOIN project_members pm ON tc.project_id = pm.project_id
    WHERE sra.storage_path = name AND pm.user_id = auth.uid()
  )
));

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE
USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Helper function
CREATE OR REPLACE FUNCTION generate_evidence_path(p_user_id UUID, p_execution_id UUID, p_step_id UUID, p_filename TEXT)
RETURNS TEXT AS $$
BEGIN RETURN p_user_id::text || '/' || p_execution_id::text || '/' || p_step_id::text || '/' || p_filename; END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Defect attachments junction (exists, just ensure RLS policies)
DROP POLICY IF EXISTS "Users can view defect attachments" ON defect_attachments;
CREATE POLICY "Users can view defect attachments" ON defect_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM defects d JOIN project_members pm ON d.project_id = pm.project_id
  WHERE d.id = defect_attachments.defect_id AND pm.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can link attachments" ON defect_attachments;
CREATE POLICY "Users can link attachments" ON defect_attachments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM defects d JOIN project_members pm ON d.project_id = pm.project_id
  WHERE d.id = defect_attachments.defect_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'tester', 'lead')
));