-- Create storage bucket for EFD documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'efd-documents',
  'efd-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
);

-- Allow authenticated users to upload to their session folder
CREATE POLICY "Users can upload documents to their sessions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'efd-documents' AND
  EXISTS (
    SELECT 1 FROM efd_wizard_sessions 
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Allow users to read their own session documents
CREATE POLICY "Users can read their session documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'efd-documents' AND
  EXISTS (
    SELECT 1 FROM efd_wizard_sessions 
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Allow users to delete their session documents
CREATE POLICY "Users can delete their session documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'efd-documents' AND
  EXISTS (
    SELECT 1 FROM efd_wizard_sessions 
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Add generation_settings column to efd_wizard_sessions for AI config persistence
ALTER TABLE efd_wizard_sessions 
ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{}'::jsonb;