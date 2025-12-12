-- Storage RLS policies for anonymous external intake uploads
-- Allow anonymous users to INSERT files ONLY under the public-intake/ prefix
CREATE POLICY "Anonymous users can upload to public-intake folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = 'public-intake'
);

-- Allow authenticated users to READ files from public-intake folder
-- (So internal PMO/SEO users can view attachments from external submissions)
CREATE POLICY "Authenticated users can read public-intake files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = 'public-intake'
);

-- Allow authenticated users to DELETE files from public-intake folder
-- (For cleanup/management of external attachments)
CREATE POLICY "Authenticated users can delete public-intake files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = 'public-intake'
);