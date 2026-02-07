-- ═══════════════════════════════════════════════════════════════════════════
-- TESTHUB DATABASE SETUP - ISOLATED th_* TABLES
-- Preserves existing tm_* tables - creates separate TestHub namespace
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: CREATE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- TestHub Folders
CREATE TABLE th_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES th_folders(id) ON DELETE CASCADE,
  icon TEXT DEFAULT '📁',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Cases
CREATE TABLE th_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  objective TEXT,
  preconditions TEXT,
  folder_id UUID REFERENCES th_folders(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  type TEXT DEFAULT 'functional' CHECK (type IN ('functional', 'regression', 'security', 'integration', 'performance')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'approved', 'deprecated')),
  automation TEXT DEFAULT 'manual' CHECK (automation IN ('manual', 'automated', 'planned')),
  owner_id UUID,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Steps
CREATE TABLE th_test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  shared_step_id UUID,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Shared Steps
CREATE TABLE th_shared_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Case Versions (history)
CREATE TABLE th_test_case_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changes JSONB NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Case Links (requirements, defects, stories)
CREATE TABLE th_test_case_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('requirement', 'defect', 'story')),
  linked_item_key TEXT NOT NULL,
  linked_item_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Case Attachments
CREATE TABLE th_test_case_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  step_id UUID REFERENCES th_test_steps(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestHub Test Executions (runs)
CREATE TABLE th_test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  test_cycle_id UUID,
  cycle_name TEXT,
  result TEXT CHECK (result IN ('passed', 'failed', 'blocked', 'skipped')),
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: CREATE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_th_folders_parent ON th_folders(parent_id);
CREATE INDEX idx_th_test_cases_folder ON th_test_cases(folder_id);
CREATE INDEX idx_th_test_cases_status ON th_test_cases(status);
CREATE INDEX idx_th_test_cases_priority ON th_test_cases(priority);
CREATE INDEX idx_th_test_cases_case_key ON th_test_cases(case_key);
CREATE INDEX idx_th_test_steps_case ON th_test_steps(test_case_id);
CREATE INDEX idx_th_test_case_links_case ON th_test_case_links(test_case_id);
CREATE INDEX idx_th_test_case_versions_case ON th_test_case_versions(test_case_id);
CREATE INDEX idx_th_test_executions_case ON th_test_executions(test_case_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE th_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_shared_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_case_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_case_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_executions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: CREATE RLS POLICIES (Allow all for authenticated users)
-- ═══════════════════════════════════════════════════════════════════════════

-- Folders policies
CREATE POLICY "Allow select th_folders" ON th_folders FOR SELECT USING (true);
CREATE POLICY "Allow insert th_folders" ON th_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_folders" ON th_folders FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_folders" ON th_folders FOR DELETE USING (true);

-- Test cases policies
CREATE POLICY "Allow select th_test_cases" ON th_test_cases FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_cases" ON th_test_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_cases" ON th_test_cases FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_cases" ON th_test_cases FOR DELETE USING (true);

-- Test steps policies
CREATE POLICY "Allow select th_test_steps" ON th_test_steps FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_steps" ON th_test_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_steps" ON th_test_steps FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_steps" ON th_test_steps FOR DELETE USING (true);

-- Shared steps policies
CREATE POLICY "Allow select th_shared_steps" ON th_shared_steps FOR SELECT USING (true);
CREATE POLICY "Allow insert th_shared_steps" ON th_shared_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_shared_steps" ON th_shared_steps FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_shared_steps" ON th_shared_steps FOR DELETE USING (true);

-- Versions policies
CREATE POLICY "Allow select th_test_case_versions" ON th_test_case_versions FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_case_versions" ON th_test_case_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_case_versions" ON th_test_case_versions FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_case_versions" ON th_test_case_versions FOR DELETE USING (true);

-- Links policies
CREATE POLICY "Allow select th_test_case_links" ON th_test_case_links FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_case_links" ON th_test_case_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_case_links" ON th_test_case_links FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_case_links" ON th_test_case_links FOR DELETE USING (true);

-- Attachments policies
CREATE POLICY "Allow select th_test_case_attachments" ON th_test_case_attachments FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_case_attachments" ON th_test_case_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_case_attachments" ON th_test_case_attachments FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_case_attachments" ON th_test_case_attachments FOR DELETE USING (true);

-- Executions policies
CREATE POLICY "Allow select th_test_executions" ON th_test_executions FOR SELECT USING (true);
CREATE POLICY "Allow insert th_test_executions" ON th_test_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update th_test_executions" ON th_test_executions FOR UPDATE USING (true);
CREATE POLICY "Allow delete th_test_executions" ON th_test_executions FOR DELETE USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: CREATE TRIGGER FOR updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_th_test_cases_updated_at
  BEFORE UPDATE ON th_test_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_th_folders_updated_at
  BEFORE UPDATE ON th_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();