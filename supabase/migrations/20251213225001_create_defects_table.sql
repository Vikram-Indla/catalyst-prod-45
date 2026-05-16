-- Stub migration: creates public.defects which existed as a pre-existing table
-- in the Lovable-managed database but was never explicitly created via a migration.
-- All subsequent migrations that ALTER or reference public.defects depend on this.

CREATE TABLE IF NOT EXISTS public.defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  defect_key VARCHAR(20),
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  release_id UUID,
  test_case_id UUID,
  test_run_id UUID,
  step_number INTEGER,
  external_id VARCHAR(100),
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_project_id ON public.defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON public.defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_severity ON public.defects(severity);
CREATE INDEX IF NOT EXISTS idx_defects_release_id ON public.defects(release_id);
