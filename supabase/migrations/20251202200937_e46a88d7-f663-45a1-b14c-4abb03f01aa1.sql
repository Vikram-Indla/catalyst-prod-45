-- Create storage bucket for ideation attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ideation-attachments', 'ideation-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for ideation attachments
CREATE POLICY "Anyone can view ideation attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ideation-attachments');

CREATE POLICY "Authenticated users can upload ideation attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ideation-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own ideation attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ideation-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);