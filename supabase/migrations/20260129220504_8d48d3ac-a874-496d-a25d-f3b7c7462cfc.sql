-- Create the attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Create policy to allow public read access
CREATE POLICY "Public can view attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Create policy to allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');