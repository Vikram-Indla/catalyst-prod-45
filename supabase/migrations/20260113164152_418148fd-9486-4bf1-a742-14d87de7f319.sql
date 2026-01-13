-- ================================================================
-- EVIDENCE SYSTEM ENHANCEMENTS
-- Add capture_method, dimensions, and metadata columns
-- ================================================================

-- Add new columns to test_evidence table
ALTER TABLE public.test_evidence 
ADD COLUMN IF NOT EXISTS capture_method text DEFAULT 'file_browser',
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS original_file_name text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Add constraint for capture_method valid values
ALTER TABLE public.test_evidence
DROP CONSTRAINT IF EXISTS test_evidence_capture_method_check;

ALTER TABLE public.test_evidence
ADD CONSTRAINT test_evidence_capture_method_check 
CHECK (capture_method IN ('screen_capture', 'clipboard_paste', 'drag_drop', 'file_browser'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_evidence_capture_method ON public.test_evidence(capture_method);
CREATE INDEX IF NOT EXISTS idx_test_evidence_is_deleted ON public.test_evidence(is_deleted) WHERE is_deleted = false;

-- Create evidence storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence', 
  'evidence', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']::text[];

-- Create RLS policies for evidence storage bucket
CREATE POLICY "Authenticated users can view evidence" ON storage.objects
FOR SELECT USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload evidence" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own evidence" ON storage.objects
FOR DELETE USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);