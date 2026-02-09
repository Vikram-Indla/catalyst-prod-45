-- Create storage bucket for test step attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('testhub-attachments', 'testhub-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to testhub-attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'testhub-attachments');

-- Allow public read access
CREATE POLICY "Allow public read testhub-attachments" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'testhub-attachments');

-- Allow users to delete their uploads
CREATE POLICY "Allow delete testhub-attachments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'testhub-attachments');

-- Create attachments table
CREATE TABLE IF NOT EXISTS th_step_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES th_test_steps(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES th_test_cases(id) ON DELETE CASCADE,
  step_number INTEGER,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE th_step_attachments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated on th_step_attachments"
ON th_step_attachments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow read for anon
CREATE POLICY "Allow read for anon on th_step_attachments"
ON th_step_attachments
FOR SELECT
TO anon
USING (true);