-- ══════════════════════════════════════════════════════════════════════════════
-- MY TEST SCOPE DATABASE SCHEMA - Adapted for existing tm_ tables
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 1: user_test_scope
-- Personalized test assignments for each user
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_test_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  
  -- AI Priority Scoring
  priority_score INTEGER NOT NULL DEFAULT 0,
  
  -- Due Date Management
  due_date TIMESTAMPTZ,
  
  -- Execution Status
  status TEXT NOT NULL DEFAULT 'not_run' CHECK (status IN ('not_run', 'in_progress', 'passed', 'failed', 'blocked', 'skipped')),
  
  -- Timestamps
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(user_id, test_case_id, cycle_id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_test_scope
CREATE INDEX idx_user_test_scope_user ON user_test_scope(user_id);
CREATE INDEX idx_user_test_scope_status ON user_test_scope(status);
CREATE INDEX idx_user_test_scope_score ON user_test_scope(priority_score DESC);
CREATE INDEX idx_user_test_scope_due ON user_test_scope(due_date);

-- Trigger to auto-update updated_at
CREATE TRIGGER user_test_scope_updated_at
  BEFORE UPDATE ON user_test_scope
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 2: test_defect_links
-- Links between tests and defects
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.test_defect_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  
  -- Link metadata
  link_type TEXT NOT NULL DEFAULT 'blocks' CHECK (link_type IN ('blocks', 'caused_by', 'related_to', 'duplicates')),
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(test_case_id, defect_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_defect_links_test ON test_defect_links(test_case_id);
CREATE INDEX idx_test_defect_links_defect ON test_defect_links(defect_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 3: test_incident_links
-- Links between tests and production incidents
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.test_incident_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  
  -- Link metadata
  link_type TEXT NOT NULL DEFAULT 'validates' CHECK (link_type IN ('validates', 'caused_by', 'related_to')),
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(test_case_id, incident_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_incident_links_test ON test_incident_links(test_case_id);
CREATE INDEX idx_test_incident_links_incident ON test_incident_links(incident_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 4: requirements (if not exists)
-- Requirements for traceability
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Classification
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),
  type TEXT CHECK (type IN ('functional', 'non_functional', 'business', 'technical')),
  
  -- Hierarchy
  parent_id UUID REFERENCES requirements(id),
  
  -- Ownership
  owner_id UUID REFERENCES auth.users(id),
  
  -- External references
  external_url TEXT,
  external_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_parent ON requirements(parent_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 5: test_requirement_links
-- Coverage mapping between tests and requirements
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.test_requirement_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  
  -- Coverage status (derived from test execution)
  coverage_status TEXT NOT NULL DEFAULT 'not_run' CHECK (coverage_status IN ('not_run', 'passed', 'failed', 'partial')),
  
  -- Link metadata
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(test_case_id, requirement_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_requirement_links_test ON test_requirement_links(test_case_id);
CREATE INDEX idx_test_requirement_links_requirement ON test_requirement_links(requirement_id);
CREATE INDEX idx_test_requirement_links_coverage ON test_requirement_links(coverage_status);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE 6: user_workload_summary
-- Daily workload metrics per user
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_workload_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Test counts
  tests_assigned INTEGER NOT NULL DEFAULT 0,
  tests_completed INTEGER NOT NULL DEFAULT 0,
  tests_remaining INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  tests_blocked INTEGER NOT NULL DEFAULT 0,
  
  -- Time tracking
  estimated_hours_remaining DECIMAL(5,2) DEFAULT 0,
  actual_hours_spent DECIMAL(5,2) DEFAULT 0,
  
  -- Deadline info
  next_deadline TIMESTAMPTZ,
  days_until_deadline INTEGER,
  
  -- Constraints
  UNIQUE(user_id, date),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_workload_summary_user ON user_workload_summary(user_id);
CREATE INDEX idx_user_workload_summary_date ON user_workload_summary(date DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE user_test_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_defect_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_incident_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_requirement_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workload_summary ENABLE ROW LEVEL SECURITY;

-- user_test_scope: Users can see and update their own assignments
CREATE POLICY "Users can view their own test scope" ON user_test_scope
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own test scope" ON user_test_scope
  FOR UPDATE USING (auth.uid() = user_id);

-- test_defect_links: All authenticated users can view
CREATE POLICY "Authenticated users can view test defect links" ON test_defect_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert test defect links" ON test_defect_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- test_incident_links: All authenticated users can view
CREATE POLICY "Authenticated users can view test incident links" ON test_incident_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert test incident links" ON test_incident_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- requirements: All authenticated users can view
CREATE POLICY "Authenticated users can view requirements" ON requirements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert requirements" ON requirements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update requirements" ON requirements
  FOR UPDATE USING (auth.role() = 'authenticated');

-- test_requirement_links: All authenticated users can view
CREATE POLICY "Authenticated users can view test requirement links" ON test_requirement_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert test requirement links" ON test_requirement_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update test requirement links" ON test_requirement_links
  FOR UPDATE USING (auth.role() = 'authenticated');

-- user_workload_summary: Users can only see their own data
CREATE POLICY "Users can view their own workload summary" ON user_workload_summary
  FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime for user_test_scope
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_test_scope;