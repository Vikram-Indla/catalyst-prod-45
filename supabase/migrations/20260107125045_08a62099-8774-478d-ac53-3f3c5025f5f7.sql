-- Create storage bucket for AI Assist summaries/PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-assist-summaries', 'ai-assist-summaries', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to read their own files
CREATE POLICY "Users can read ai-assist summaries"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ai-assist-summaries' 
  AND auth.role() = 'authenticated'
);

-- Create policy to allow service role to insert files
CREATE POLICY "Service role can insert ai-assist summaries"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-assist-summaries'
);

-- Create policy to allow service role to update files
CREATE POLICY "Service role can update ai-assist summaries"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ai-assist-summaries'
);