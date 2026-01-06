-- ============================================================
-- PHASE 1: TEST MANAGEMENT DATABASE SCHEMA (Corrected)
-- Uses existing column names where tables already exist
-- ============================================================

-- STEP 1.1: Create test_folders table (if not exists)
CREATE TABLE IF NOT EXISTS test_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES test_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_project ON test_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON test_folders(parent_id);

ALTER TABLE test_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folders_select" ON test_folders;
DROP POLICY IF EXISTS "folders_all" ON test_folders;
CREATE POLICY "folders_select" ON test_folders FOR SELECT USING (true);
CREATE POLICY "folders_all" ON test_folders FOR ALL USING (true);

-- STEP 1.2: Create test_cases table (if not exists)
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL,
  test_key VARCHAR(20),
  title VARCHAR(500) NOT NULL,
  objective TEXT,
  preconditions TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  test_type VARCHAR(50) DEFAULT 'functional',
  status VARCHAR(20) DEFAULT 'draft',
  automation_status VARCHAR(20) DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id),
  assignee_id UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}'
);

-- Auto-generate test_key
CREATE OR REPLACE FUNCTION generate_test_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(test_key FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM test_cases
  WHERE project_id = NEW.project_id;
  
  NEW.test_key := 'TC-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_test_key ON test_cases;
CREATE TRIGGER set_test_key
  BEFORE INSERT ON test_cases
  FOR EACH ROW
  WHEN (NEW.test_key IS NULL)
  EXECUTE FUNCTION generate_test_key();

CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_folder ON test_cases(folder_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);

ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "test_cases_select" ON test_cases;
DROP POLICY IF EXISTS "test_cases_all" ON test_cases;
CREATE POLICY "test_cases_select" ON test_cases FOR SELECT USING (true);
CREATE POLICY "test_cases_all" ON test_cases FOR ALL USING (true);

-- STEP 1.3: Extend test_steps table (add missing columns if they don't exist)
-- Note: test_steps uses step_order instead of step_number
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'evidence_required') THEN
    ALTER TABLE test_steps ADD COLUMN evidence_required BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'test_data') THEN
    ALTER TABLE test_steps ADD COLUMN test_data TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_steps_test_case ON test_steps(test_case_id, step_order);

ALTER TABLE test_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "steps_select" ON test_steps;
DROP POLICY IF EXISTS "steps_all" ON test_steps;
CREATE POLICY "steps_select" ON test_steps FOR SELECT USING (true);
CREATE POLICY "steps_all" ON test_steps FOR ALL USING (true);

-- STEP 1.4: Create test_cycles table (if not exists)
CREATE TABLE IF NOT EXISTS test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  cycle_key VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'planned',
  environment VARCHAR(100),
  build_version VARCHAR(100),
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_cycle_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(cycle_key FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM test_cycles
  WHERE project_id = NEW.project_id;
  
  NEW.cycle_key := 'CY-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cycle_key ON test_cycles;
CREATE TRIGGER set_cycle_key
  BEFORE INSERT ON test_cycles
  FOR EACH ROW
  WHEN (NEW.cycle_key IS NULL)
  EXECUTE FUNCTION generate_cycle_key();

CREATE INDEX IF NOT EXISTS idx_cycles_project ON test_cycles(project_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON test_cycles(status);

ALTER TABLE test_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycles_select" ON test_cycles;
DROP POLICY IF EXISTS "cycles_all" ON test_cycles;
CREATE POLICY "cycles_select" ON test_cycles FOR SELECT USING (true);
CREATE POLICY "cycles_all" ON test_cycles FOR ALL USING (true);

-- STEP 1.5: Create test_runs table (if not exists)
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_cycle_id UUID NOT NULL REFERENCES test_cycles(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_run',
  assignee_id UUID REFERENCES auth.users(id),
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_test_in_cycle UNIQUE (test_cycle_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_runs_cycle ON test_runs(test_cycle_id);
CREATE INDEX IF NOT EXISTS idx_runs_test_case ON test_runs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_assignee ON test_runs(assignee_id);

ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "runs_select" ON test_runs;
DROP POLICY IF EXISTS "runs_all" ON test_runs;
CREATE POLICY "runs_select" ON test_runs FOR SELECT USING (true);
CREATE POLICY "runs_all" ON test_runs FOR ALL USING (true);

-- STEP 1.6: Create step_results table (if not exists)
CREATE TABLE IF NOT EXISTS step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  test_step_id UUID NOT NULL REFERENCES test_steps(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_run',
  actual_result TEXT,
  notes TEXT,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ,
  CONSTRAINT unique_step_result UNIQUE (test_run_id, test_step_id)
);

CREATE INDEX IF NOT EXISTS idx_step_results_run ON step_results(test_run_id);

ALTER TABLE step_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "step_results_select" ON step_results;
DROP POLICY IF EXISTS "step_results_all" ON step_results;
CREATE POLICY "step_results_select" ON step_results FOR SELECT USING (true);
CREATE POLICY "step_results_all" ON step_results FOR ALL USING (true);

-- STEP 1.7: Extend existing defects table for TM integration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'defect_key') THEN
    ALTER TABLE defects ADD COLUMN defect_key VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'test_case_id') THEN
    ALTER TABLE defects ADD COLUMN test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'test_run_id') THEN
    ALTER TABLE defects ADD COLUMN test_run_id UUID REFERENCES test_runs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'step_number') THEN
    ALTER TABLE defects ADD COLUMN step_number INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'external_id') THEN
    ALTER TABLE defects ADD COLUMN external_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'external_url') THEN
    ALTER TABLE defects ADD COLUMN external_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'reported_by') THEN
    ALTER TABLE defects ADD COLUMN reported_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'defects' AND column_name = 'status') THEN
    ALTER TABLE defects ADD COLUMN status VARCHAR(20) DEFAULT 'open';
  END IF;
END $$;

-- Create defect_key generator
CREATE OR REPLACE FUNCTION generate_defect_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(defect_key FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM defects
  WHERE project_id = NEW.project_id;
  
  NEW.defect_key := 'DEF-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_defect_key ON defects;
CREATE TRIGGER set_defect_key
  BEFORE INSERT ON defects
  FOR EACH ROW
  WHEN (NEW.defect_key IS NULL)
  EXECUTE FUNCTION generate_defect_key();

CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_severity ON defects(severity);

ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "defects_select" ON defects;
DROP POLICY IF EXISTS "defects_all" ON defects;
CREATE POLICY "defects_select" ON defects FOR SELECT USING (true);
CREATE POLICY "defects_all" ON defects FOR ALL USING (true);

-- STEP 1.8: Extend requirements table for TM integration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'requirement_key') THEN
    ALTER TABLE requirements ADD COLUMN requirement_key VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'type') THEN
    ALTER TABLE requirements ADD COLUMN type VARCHAR(50) DEFAULT 'story';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'external_id') THEN
    ALTER TABLE requirements ADD COLUMN external_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'external_url') THEN
    ALTER TABLE requirements ADD COLUMN external_url TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirements_select" ON requirements;
DROP POLICY IF EXISTS "requirements_all" ON requirements;
CREATE POLICY "requirements_select" ON requirements FOR SELECT USING (true);
CREATE POLICY "requirements_all" ON requirements FOR ALL USING (true);

-- STEP 1.9: Create test_case_requirements junction table
CREATE TABLE IF NOT EXISTS test_case_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tc_req UNIQUE (test_case_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_req_test_case ON test_case_requirements(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_req_requirement ON test_case_requirements(requirement_id);

ALTER TABLE test_case_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tc_req_select" ON test_case_requirements;
DROP POLICY IF EXISTS "tc_req_all" ON test_case_requirements;
CREATE POLICY "tc_req_select" ON test_case_requirements FOR SELECT USING (true);
CREATE POLICY "tc_req_all" ON test_case_requirements FOR ALL USING (true);

-- STEP 1.10: Create dashboard statistics function
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_test_cases', (SELECT COUNT(*) FROM test_cases WHERE project_id = p_project_id),
    'draft_count', (SELECT COUNT(*) FROM test_cases WHERE project_id = p_project_id AND status = 'draft'),
    'ready_count', (SELECT COUNT(*) FROM test_cases WHERE project_id = p_project_id AND status = 'ready'),
    'approved_count', (SELECT COUNT(*) FROM test_cases WHERE project_id = p_project_id AND status = 'approved'),
    'total_cycles', (SELECT COUNT(*) FROM test_cycles WHERE project_id = p_project_id),
    'active_cycles', (SELECT COUNT(*) FROM test_cycles WHERE project_id = p_project_id AND status = 'in_progress'),
    'total_runs', (SELECT COUNT(*) FROM test_runs tr JOIN test_cycles tc ON tr.test_cycle_id = tc.id WHERE tc.project_id = p_project_id),
    'passed_runs', (SELECT COUNT(*) FROM test_runs tr JOIN test_cycles tc ON tr.test_cycle_id = tc.id WHERE tc.project_id = p_project_id AND tr.status = 'passed'),
    'failed_runs', (SELECT COUNT(*) FROM test_runs tr JOIN test_cycles tc ON tr.test_cycle_id = tc.id WHERE tc.project_id = p_project_id AND tr.status = 'failed'),
    'blocked_runs', (SELECT COUNT(*) FROM test_runs tr JOIN test_cycles tc ON tr.test_cycle_id = tc.id WHERE tc.project_id = p_project_id AND tr.status = 'blocked'),
    'not_run', (SELECT COUNT(*) FROM test_runs tr JOIN test_cycles tc ON tr.test_cycle_id = tc.id WHERE tc.project_id = p_project_id AND tr.status = 'not_run'),
    'open_defects', (SELECT COUNT(*) FROM defects WHERE project_id = p_project_id AND (status IS NULL OR status IN ('open', 'in_progress', 'reopened'))),
    'critical_defects', (SELECT COUNT(*) FROM defects WHERE project_id = p_project_id AND severity IN ('blocker', 'critical') AND (status IS NULL OR status NOT IN ('closed', 'verified')))
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- STEP 1.11: Create cycle progress function
CREATE OR REPLACE FUNCTION get_cycle_progress(p_cycle_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'passed', COUNT(*) FILTER (WHERE status = 'passed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
    'not_run', COUNT(*) FILTER (WHERE status = 'not_run'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'skipped', COUNT(*) FILTER (WHERE status = 'skipped')
  ) INTO result
  FROM test_runs
  WHERE test_cycle_id = p_cycle_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;