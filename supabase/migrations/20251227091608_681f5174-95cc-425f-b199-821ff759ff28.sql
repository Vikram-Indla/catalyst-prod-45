-- ═══════════════════════════════════════════════════════════════
-- Mock Data Generator Tables
-- ═══════════════════════════════════════════════════════════════

-- Key sequences for generating AAA-000001 format keys
CREATE TABLE IF NOT EXISTS public.key_sequences (
  prefix TEXT PRIMARY KEY,
  next_value BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Main mock runs table
CREATE TABLE IF NOT EXISTS public.mock_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'csv', 'markdown', 'text', 'synthetic')),
  source_name TEXT,
  seed TEXT,
  config_json JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'configuring', 'parsing', 'generating', 'previewing', 'loading', 'loaded', 'cleaning', 'cleaned', 'error')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files uploaded for mock runs
CREATE TABLE IF NOT EXISTS public.mock_run_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.mock_runs(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preview data for mock runs
CREATE TABLE IF NOT EXISTS public.mock_run_preview (
  run_id UUID PRIMARY KEY REFERENCES public.mock_runs(id) ON DELETE CASCADE,
  preview_json JSONB DEFAULT '{}',
  link_health_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entity mapping for cleanup tracking
CREATE TABLE IF NOT EXISTS public.mock_run_entity_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.mock_runs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_runs_created_by ON public.mock_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_mock_runs_status ON public.mock_runs(status);
CREATE INDEX IF NOT EXISTS idx_mock_run_files_run_id ON public.mock_run_files(run_id);
CREATE INDEX IF NOT EXISTS idx_mock_run_entity_map_run_id ON public.mock_run_entity_map(run_id);
CREATE INDEX IF NOT EXISTS idx_mock_run_entity_map_entity ON public.mock_run_entity_map(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.key_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_run_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_run_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_run_entity_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admin full access to key_sequences"
ON public.key_sequences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin full access to mock_runs"
ON public.mock_runs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin full access to mock_run_files"
ON public.mock_run_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin full access to mock_run_preview"
ON public.mock_run_preview
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admin full access to mock_run_entity_map"
ON public.mock_run_entity_map
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_key_sequences_updated_at
  BEFORE UPDATE ON public.key_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_runs_updated_at
  BEFORE UPDATE ON public.mock_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_run_files_updated_at
  BEFORE UPDATE ON public.mock_run_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_run_preview_updated_at
  BEFORE UPDATE ON public.mock_run_preview
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();