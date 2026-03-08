
-- B2: Add pdf_filename and pdf_attached_at to brd_documents if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brd_documents' AND column_name = 'pdf_filename') THEN
    ALTER TABLE public.brd_documents ADD COLUMN pdf_filename TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brd_documents' AND column_name = 'pdf_attached_at') THEN
    ALTER TABLE public.brd_documents ADD COLUMN pdf_attached_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Make brd-attachments bucket private (not public) for signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'brd-attachments';

-- Storage RLS: allow authenticated users to upload/read
CREATE POLICY "Allow authenticated uploads to brd-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brd-attachments');

CREATE POLICY "Allow authenticated reads from brd-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'brd-attachments');

CREATE POLICY "Allow anon reads from brd-attachments"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'brd-attachments');

CREATE POLICY "Allow anon uploads to brd-attachments"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'brd-attachments');
