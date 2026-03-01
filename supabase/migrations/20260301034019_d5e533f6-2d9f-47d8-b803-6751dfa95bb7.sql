
-- Create wiki-docs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('wiki-docs', 'wiki-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to wiki-docs
CREATE POLICY "Authenticated users can upload wiki docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wiki-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to read wiki docs
CREATE POLICY "Authenticated users can read wiki docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'wiki-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete wiki docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'wiki-docs' AND auth.role() = 'authenticated');
