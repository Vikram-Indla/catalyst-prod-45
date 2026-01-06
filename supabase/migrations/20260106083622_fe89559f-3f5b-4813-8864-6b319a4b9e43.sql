-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Requirements Traceability Module
-- ══════════════════════════════════════════════════════════════════════════════

-- Create requirement type enum
DO $$ BEGIN
  CREATE TYPE requirement_type AS ENUM (
    'epic',
    'feature',
    'story',
    'task',
    'bug',
    'improvement'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create requirement status enum
DO $$ BEGIN
  CREATE TYPE requirement_status AS ENUM (
    'backlog',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create requirement priority enum
DO $$ BEGIN
  CREATE TYPE requirement_priority AS ENUM (
    'highest',
    'high',
    'medium',
    'low',
    'lowest'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- Requirements Table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Identification
  requirement_key VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Classification
  type requirement_type NOT NULL DEFAULT 'story',
  status requirement_status NOT NULL DEFAULT 'backlog',
  priority requirement_priority DEFAULT 'medium',
  
  -- Hierarchy
  parent_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  
  -- External Integration (Jira)
  external_id VARCHAR(100),
  external_key VARCHAR(50),
  external_url TEXT,
  external_type VARCHAR(50),
  
  -- Assignment
  owner_id UUID REFERENCES public.profiles(id),
  
  -- Metadata
  labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  sprint VARCHAR(100),
  release_version VARCHAR(50),
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'synced',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_requirement_key UNIQUE (project_id, requirement_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requirements_project ON public.requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_parent ON public.requirements(parent_id);
CREATE INDEX IF NOT EXISTS idx_requirements_type ON public.requirements(type);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_external ON public.requirements(external_id);
CREATE INDEX IF NOT EXISTS idx_requirements_external_key ON public.requirements(external_key);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_requirements_search ON public.requirements 
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Enable RLS
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Members can view requirements" ON public.requirements;
CREATE POLICY "Members can view requirements"
  ON public.requirements FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Members can manage requirements" ON public.requirements;
CREATE POLICY "Members can manage requirements"
  ON public.requirements FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- Requirement Test Links Table (references tm_test_cases)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.requirement_test_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.tm_test_cases(id) ON DELETE CASCADE,
  
  -- Link metadata
  link_type VARCHAR(50) DEFAULT 'covers',
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT unique_requirement_test_link UNIQUE (requirement_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_req_test_links_requirement ON public.requirement_test_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_test_links_test_case ON public.requirement_test_links(test_case_id);

ALTER TABLE public.requirement_test_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view links" ON public.requirement_test_links;
CREATE POLICY "Members can view links"
  ON public.requirement_test_links FOR SELECT
  USING (requirement_id IN (
    SELECT id FROM public.requirements WHERE project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Members can manage links" ON public.requirement_test_links;
CREATE POLICY "Members can manage links"
  ON public.requirement_test_links FOR ALL
  USING (requirement_id IN (
    SELECT id FROM public.requirements WHERE project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- Jira Sync History Table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.jira_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type VARCHAR(50) NOT NULL,
  sync_direction VARCHAR(20) NOT NULL,
  
  -- Results
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  requirements_created INTEGER DEFAULT 0,
  requirements_updated INTEGER DEFAULT 0,
  requirements_deleted INTEGER DEFAULT 0,
  links_created INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES public.profiles(id),
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jira_sync_project ON public.jira_sync_history(project_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_started ON public.jira_sync_history(started_at DESC);

ALTER TABLE public.jira_sync_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view jira sync history" ON public.jira_sync_history;
CREATE POLICY "Members can view jira sync history"
  ON public.jira_sync_history FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

-- Update trigger
DROP TRIGGER IF EXISTS update_requirements_timestamp ON public.requirements;
CREATE TRIGGER update_requirements_timestamp
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();