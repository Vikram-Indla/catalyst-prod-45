-- Create import_history table for tracking test case imports
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('csv', 'excel')),
  total_records INTEGER NOT NULL DEFAULT 0,
  imported_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  imported_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_evidence table for storing test execution evidence files
CREATE TABLE IF NOT EXISTS public.test_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_step_id UUID NOT NULL REFERENCES public.test_execution_steps(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'log')),
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_history_imported_by ON public.import_history(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON public.import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_evidence_execution_step_id ON public.test_evidence(execution_step_id);
CREATE INDEX IF NOT EXISTS idx_test_evidence_uploaded_by ON public.test_evidence(uploaded_by);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_history
CREATE POLICY "Users can view their own import history"
  ON public.import_history FOR SELECT
  USING (imported_by = auth.uid());

CREATE POLICY "Users can insert import history"
  ON public.import_history FOR INSERT
  WITH CHECK (imported_by = auth.uid());

-- RLS Policies for test_evidence
CREATE POLICY "Users can view test evidence"
  ON public.test_evidence FOR SELECT
  USING (true);

CREATE POLICY "Users can insert test evidence"
  ON public.test_evidence FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own test evidence"
  ON public.test_evidence FOR DELETE
  USING (uploaded_by = auth.uid());

-- Create storage bucket for test evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-evidence', 'test-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for test evidence bucket
CREATE POLICY "Users can upload test evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'test-evidence' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view test evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'test-evidence');

CREATE POLICY "Users can delete their own test evidence"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'test-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );