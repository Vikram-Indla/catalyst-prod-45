-- G3 follow-up: drop permissive policies on storage.objects for the 'attachments' bucket
-- These OR-combined with the new restrictive `attachments_storage_delete_uploader_or_admin`,
-- making the restrictive policy a no-op. Closes the P12 gap.

DROP POLICY IF EXISTS "Allow authenticated deletes from attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to attachments" ON storage.objects;