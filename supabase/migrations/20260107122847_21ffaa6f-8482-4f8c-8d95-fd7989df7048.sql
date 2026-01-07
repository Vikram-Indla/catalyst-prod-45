-- Create storage bucket for AI Assist documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-assist',
  'ai-assist',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for ai-assist bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-assist');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ai-assist');

CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ai-assist');

-- Add file_sha256 column to ai_assist_documents if not exists
ALTER TABLE public.ai_assist_documents 
ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

-- Add page_hashes column to ai_assist_documents for future use
ALTER TABLE public.ai_assist_documents 
ADD COLUMN IF NOT EXISTS page_hashes JSONB DEFAULT '[]'::jsonb;