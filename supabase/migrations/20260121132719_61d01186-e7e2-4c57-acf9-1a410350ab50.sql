
-- =====================================================
-- MODULE 4B-3: RICH TEXT & ATTACHMENTS
-- Adds rich text fields and attachment storage for test cases
-- =====================================================

-- Add rich text fields to test cases
ALTER TABLE tm_test_cases 
ADD COLUMN IF NOT EXISTS description_html TEXT,
ADD COLUMN IF NOT EXISTS preconditions_html TEXT,
ADD COLUMN IF NOT EXISTS postconditions_html TEXT;

-- Add rich text to test steps
ALTER TABLE tm_test_steps
ADD COLUMN IF NOT EXISTS action_html TEXT,
ADD COLUMN IF NOT EXISTS expected_result_html TEXT;

-- Create attachments table for test cases
CREATE TABLE IF NOT EXISTS tm_test_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  test_step_id UUID REFERENCES tm_test_steps(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'test-attachments',
  attachment_type TEXT DEFAULT 'general' CHECK (attachment_type IN ('general', 'screenshot', 'document', 'video', 'data')),
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create storage bucket for test attachments (if not exists, handled by Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-attachments',
  'test-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 
        'text/plain', 'text/csv', 'application/json', 'video/mp4', 'video/webm',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on attachments
ALTER TABLE tm_test_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments
CREATE POLICY "Users can view attachments in their projects"
  ON tm_test_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_test_attachments.test_case_id
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage attachments in their projects"
  ON tm_test_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_test_attachments.test_case_id
    AND pm.user_id = auth.uid()
  ));

-- Storage policies for test-attachments bucket
CREATE POLICY "Users can view test attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'test-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload test attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'test-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their test attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'test-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_attachments_case ON tm_test_attachments(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_attachments_step ON tm_test_attachments(test_step_id);

-- Function to get attachments for a test case
CREATE OR REPLACE FUNCTION tm_get_case_attachments(p_case_id UUID)
RETURNS TABLE (
  id UUID,
  test_case_id UUID,
  test_step_id UUID,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  attachment_type TEXT,
  description TEXT,
  uploaded_by UUID,
  uploader_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.test_case_id,
    a.test_step_id,
    a.file_name,
    a.file_path,
    a.file_size,
    a.mime_type,
    a.attachment_type,
    a.description,
    a.uploaded_by,
    COALESCE(p.full_name, p.email, 'Unknown') as uploader_name,
    a.created_at
  FROM tm_test_attachments a
  LEFT JOIN profiles p ON p.id = a.uploaded_by
  WHERE a.test_case_id = p_case_id
  ORDER BY a.created_at DESC;
END;
$$;

-- Function to add attachment record
CREATE OR REPLACE FUNCTION tm_add_attachment(
  p_case_id UUID,
  p_step_id UUID,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT,
  p_attachment_type TEXT DEFAULT 'general',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tm_test_attachments (
    test_case_id,
    test_step_id,
    file_name,
    file_path,
    file_size,
    mime_type,
    attachment_type,
    description,
    uploaded_by
  ) VALUES (
    p_case_id,
    p_step_id,
    p_file_name,
    p_file_path,
    p_file_size,
    p_mime_type,
    p_attachment_type,
    p_description,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to delete attachment
CREATE OR REPLACE FUNCTION tm_delete_attachment(p_attachment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file_path TEXT;
BEGIN
  SELECT file_path INTO v_file_path
  FROM tm_test_attachments
  WHERE id = p_attachment_id;

  DELETE FROM tm_test_attachments WHERE id = p_attachment_id;

  RETURN jsonb_build_object(
    'success', true,
    'file_path', v_file_path
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION tm_get_case_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION tm_add_attachment TO authenticated;
GRANT EXECUTE ON FUNCTION tm_delete_attachment TO authenticated;
