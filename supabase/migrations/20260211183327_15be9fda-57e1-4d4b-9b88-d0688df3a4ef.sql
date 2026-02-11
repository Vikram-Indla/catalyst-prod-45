
-- Create th_defect_attachments table
CREATE TABLE IF NOT EXISTS public.th_defect_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  defect_id UUID NOT NULL REFERENCES public.th_defects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.th_defect_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view defect attachments"
  ON public.th_defect_attachments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create defect attachments"
  ON public.th_defect_attachments FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete defect attachments"
  ON public.th_defect_attachments FOR DELETE
  TO authenticated USING (true);

-- Create storage bucket for defect attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('defect-attachments', 'defect-attachments', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload defect attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'defect-attachments');

CREATE POLICY "Anyone can view defect attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'defect-attachments');

CREATE POLICY "Authenticated users can delete defect attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'defect-attachments');
