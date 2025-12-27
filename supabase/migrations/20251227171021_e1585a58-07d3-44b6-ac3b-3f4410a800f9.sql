-- Create storage bucket for mock data uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-data-uploads', 'mock-data-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload mock data files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mock-data-uploads');

-- Create policy for authenticated users to read their uploads
CREATE POLICY "Authenticated users can read mock data files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mock-data-uploads');

-- Create policy for admins to delete files
CREATE POLICY "Admins can delete mock data files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mock-data-uploads');

-- Add file_path column to mock_runs table if not exists
ALTER TABLE public.mock_runs 
ADD COLUMN IF NOT EXISTS file_path TEXT;