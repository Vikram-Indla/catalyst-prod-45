
-- G26: Test Plans - Add missing schema

-- Step 1: Create Enums (these don't exist yet)
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scope_type AS ENUM ('folder', 'test_case');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scope_action AS ENUM ('include', 'exclude');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add missing columns to tm_test_plans
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS entry_criteria TEXT;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS exit_criteria TEXT;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS risks_assumptions TEXT;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS scope_description TEXT;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS planned_start_date DATE;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS planned_end_date DATE;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS environments JSONB DEFAULT '[]';
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES tm_test_plans(id) ON DELETE SET NULL;
ALTER TABLE tm_test_plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Step 3: Create supporting tables
CREATE TABLE IF NOT EXISTS tm_plan_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  scope_type scope_type NOT NULL,
  entity_id UUID NOT NULL,
  action scope_action NOT NULL DEFAULT 'include',
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_scope_entry UNIQUE (plan_id, scope_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_scope_plan ON tm_plan_scope(plan_id);

CREATE TABLE IF NOT EXISTS tm_plan_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role VARCHAR(50) NOT NULL DEFAULT 'tester',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  CONSTRAINT unique_plan_team UNIQUE (plan_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_team_plan ON tm_plan_team(plan_id);

CREATE TABLE IF NOT EXISTS tm_plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_milestones_plan ON tm_plan_milestones(plan_id);

CREATE TABLE IF NOT EXISTS tm_plan_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  status approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID REFERENCES profiles(id),
  CONSTRAINT unique_plan_approver UNIQUE (plan_id, approver_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_approvals_plan ON tm_plan_approvals(plan_id);

CREATE TABLE IF NOT EXISTS tm_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON tm_plan_versions(plan_id);

-- Step 4: Plan Key Generator
CREATE OR REPLACE FUNCTION generate_plan_key(p_project_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE v_next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(plan_key, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO v_next_num FROM tm_test_plans
  WHERE project_id = p_project_id AND is_template = false AND plan_key LIKE 'TP-%';
  RETURN 'TP-' || LPAD(v_next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_plan_key()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.plan_key IS NULL OR NEW.plan_key = '') AND (NEW.is_template IS NULL OR NEW.is_template = false) THEN
    NEW.plan_key := generate_plan_key(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_plan_key ON tm_test_plans;
CREATE TRIGGER trigger_set_plan_key BEFORE INSERT ON tm_test_plans FOR EACH ROW EXECUTE FUNCTION set_plan_key();

-- Step 5: Versioning Trigger
CREATE OR REPLACE FUNCTION create_plan_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tm_plan_versions (plan_id, version, snapshot, created_by, change_summary)
    VALUES (NEW.id, NEW.version, to_jsonb(OLD), auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
    NEW.version := OLD.version + 1;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_plan_version ON tm_test_plans;
CREATE TRIGGER trigger_plan_version BEFORE UPDATE ON tm_test_plans FOR EACH ROW EXECUTE FUNCTION create_plan_version();

-- Step 6: RLS
ALTER TABLE tm_plan_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_plan_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access plan scope" ON tm_plan_scope FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access plan team" ON tm_plan_team FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access plan milestones" ON tm_plan_milestones FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access plan approvals" ON tm_plan_approvals FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated view plan versions" ON tm_plan_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert plan versions" ON tm_plan_versions FOR INSERT TO authenticated WITH CHECK (true);

-- Step 7: Progress Function
CREATE OR REPLACE FUNCTION get_plan_progress(p_plan_id UUID)
RETURNS JSON AS $$
DECLARE v_total INTEGER := 0;
BEGIN
  WITH scope_folders AS (
    SELECT entity_id FROM tm_plan_scope WHERE plan_id = p_plan_id AND scope_type = 'folder' AND action = 'include'
  ),
  scope_tests AS (
    SELECT entity_id FROM tm_plan_scope WHERE plan_id = p_plan_id AND scope_type = 'test_case' AND action = 'include'
  ),
  excluded AS (
    SELECT entity_id FROM tm_plan_scope WHERE plan_id = p_plan_id AND action = 'exclude'
  ),
  all_tests AS (
    SELECT tc.id FROM tm_test_cases tc
    WHERE (tc.folder_id IN (SELECT entity_id FROM scope_folders) OR tc.id IN (SELECT entity_id FROM scope_tests))
      AND tc.id NOT IN (SELECT entity_id FROM excluded) AND tc.is_active = true
  )
  SELECT COUNT(*) INTO v_total FROM all_tests;
  
  RETURN json_build_object(
    'total_tests', COALESCE(v_total, 0), 'executed', 0, 'passed', 0, 'failed', 0,
    'remaining', COALESCE(v_total, 0),
    'progress_percent', 0, 'pass_rate', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
