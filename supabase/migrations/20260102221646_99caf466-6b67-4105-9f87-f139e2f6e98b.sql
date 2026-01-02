-- Test Set Versions table for tracking version history
CREATE TABLE IF NOT EXISTS public.test_set_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.test_sets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  objective TEXT,
  is_smart_set BOOLEAN DEFAULT false,
  smart_set_criteria JSONB,
  snapshot_cases JSONB, -- Array of case IDs at this version
  change_summary TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient version lookups
CREATE INDEX idx_test_set_versions_set_id ON public.test_set_versions(set_id);
CREATE INDEX idx_test_set_versions_version ON public.test_set_versions(set_id, version DESC);

-- Enable RLS
ALTER TABLE public.test_set_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view test set versions in their programs"
  ON public.test_set_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_sets ts
      WHERE ts.id = test_set_versions.set_id
    )
  );

CREATE POLICY "Authenticated users can create test set versions"
  ON public.test_set_versions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Test Set Bulk Operations table
CREATE TABLE IF NOT EXISTS public.test_set_bulk_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 'move', 'copy', 'archive', 'delete', 'add_to_cycle'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  set_ids UUID[] NOT NULL,
  target_folder_id UUID REFERENCES public.test_folders(id),
  target_cycle_id UUID,
  parameters JSONB,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITHOUT TIME ZONE
);

-- Index for efficient operation lookups
CREATE INDEX idx_test_set_bulk_operations_status ON public.test_set_bulk_operations(status);
CREATE INDEX idx_test_set_bulk_operations_created_by ON public.test_set_bulk_operations(created_by);

-- Enable RLS
ALTER TABLE public.test_set_bulk_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bulk operations"
  ON public.test_set_bulk_operations
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create bulk operations"
  ON public.test_set_bulk_operations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own bulk operations"
  ON public.test_set_bulk_operations
  FOR UPDATE
  USING (created_by = auth.uid());