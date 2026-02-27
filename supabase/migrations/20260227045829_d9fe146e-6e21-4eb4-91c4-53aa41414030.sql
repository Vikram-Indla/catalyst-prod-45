
-- Add is_pinned column to ph_initiative_attachments
ALTER TABLE ph_initiative_attachments 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create storage bucket for initiative attachments if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('initiative-attachments', 'initiative-attachments', true, 6291456)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload initiative attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'initiative-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view initiative attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'initiative-attachments');

CREATE POLICY "Authenticated users can delete initiative attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'initiative-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Update policy for attachments (needed for pinning)
CREATE POLICY "Authenticated update attachments" 
ON ph_initiative_attachments FOR UPDATE 
USING (auth.uid() IS NOT NULL);
