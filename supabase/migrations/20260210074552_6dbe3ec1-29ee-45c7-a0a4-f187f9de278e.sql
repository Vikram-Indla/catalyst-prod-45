-- Allow authenticated users to upload to testhub-attachments bucket
CREATE POLICY "Allow insert testhub-attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'testhub-attachments');

-- Allow authenticated users to update in testhub-attachments bucket
CREATE POLICY "Allow update testhub-attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'testhub-attachments');