-- Check if attachments bucket exists, create if not
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 20971520, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for attachments bucket
-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Policy: Allow authenticated users to read their own uploads
CREATE POLICY "Allow authenticated reads from attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments');

-- Policy: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes from attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');