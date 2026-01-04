-- =====================================================
-- CATALYST TEST MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- =====================================================
-- ENUM TYPES (with safe creation)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE tm_case_status AS ENUM ('draft', 'ready', 'approved', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_execution_status AS ENUM ('not_run', 'in_progress', 'passed', 'failed', 'blocked', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_cycle_status AS ENUM ('planned', 'in_progress', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_defect_severity AS ENUM ('critical', 'major', 'minor', 'trivial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_defect_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'reopened');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_notification_type AS ENUM ('assignment', 'mention', 'status_change', 'comment', 'due_date');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tm_audit_action AS ENUM ('create', 'update', 'delete', 'execute', 'assign', 'clone');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. Projects
CREATE TABLE IF NOT EXISTS tm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS tm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User Roles (project-scoped)
CREATE TABLE IF NOT EXISTS tm_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES tm_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id, role_id)
);

-- 4. Folders (with LTREE path)
CREATE TABLE IF NOT EXISTS tm_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES tm_folders(id) ON DELETE CASCADE,
  path LTREE,
  depth INTEGER DEFAULT 0,
  case_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Case Priorities
CREATE TABLE IF NOT EXISTS tm_case_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Case Types
CREATE TABLE IF NOT EXISTS tm_case_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6B7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Environments
CREATE TABLE IF NOT EXISTS tm_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Labels
CREATE TABLE IF NOT EXISTS tm_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

-- 9. Test Cases
CREATE TABLE IF NOT EXISTS tm_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES tm_folders(id) ON DELETE SET NULL,
  case_key VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  preconditions TEXT,
  expected_result TEXT,
  status tm_case_status DEFAULT 'draft',
  priority_id UUID REFERENCES tm_case_priorities(id) ON DELETE SET NULL,
  case_type_id UUID REFERENCES tm_case_types(id) ON DELETE SET NULL,
  estimated_time INTEGER,
  automation_status VARCHAR(20) DEFAULT 'manual',
  automation_id VARCHAR(255),
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, case_key)
);

-- 10. Test Steps
CREATE TABLE IF NOT EXISTS tm_test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT,
  test_data TEXT,
  is_shared BOOLEAN DEFAULT false,
  shared_step_id UUID REFERENCES tm_test_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Case Labels (junction)
CREATE TABLE IF NOT EXISTS tm_case_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES tm_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_case_id, label_id)
);

-- 12. Test Sets (static groupings)
CREATE TABLE IF NOT EXISTS tm_test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_smart BOOLEAN DEFAULT false,
  smart_query JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Set Cases (junction)
CREATE TABLE IF NOT EXISTS tm_set_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_set_id UUID NOT NULL REFERENCES tm_test_sets(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_set_id, test_case_id)
);

-- 14. Test Cycles
CREATE TABLE IF NOT EXISTS tm_test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  cycle_key VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status tm_cycle_status DEFAULT 'planned',
  environment_id UUID REFERENCES tm_environments(id) ON DELETE SET NULL,
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  total_cases INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  not_run_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, cycle_key)
);

-- 15. Cycle Scope (cases in a cycle)
CREATE TABLE IF NOT EXISTS tm_cycle_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_status tm_execution_status DEFAULT 'not_run',
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cycle_id, test_case_id)
);

-- 16. Test Runs (execution instances)
CREATE TABLE IF NOT EXISTS tm_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_scope_id UUID NOT NULL REFERENCES tm_cycle_scope(id) ON DELETE CASCADE,
  run_number INTEGER DEFAULT 1,
  status tm_execution_status DEFAULT 'not_run',
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  environment_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Step Results
CREATE TABLE IF NOT EXISTS tm_step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES tm_test_runs(id) ON DELETE CASCADE,
  test_step_id UUID NOT NULL REFERENCES tm_test_steps(id) ON DELETE CASCADE,
  status tm_execution_status DEFAULT 'not_run',
  actual_result TEXT,
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. TM Defects (Test Management specific)
CREATE TABLE IF NOT EXISTS tm_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  defect_key VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity tm_defect_severity DEFAULT 'minor',
  status tm_defect_status DEFAULT 'open',
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  external_id VARCHAR(100),
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(project_id, defect_key)
);

-- 19. Defect Links
CREATE TABLE IF NOT EXISTS tm_defect_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  test_run_id UUID REFERENCES tm_test_runs(id) ON DELETE CASCADE,
  step_result_id UUID REFERENCES tm_step_results(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. TM Attachments
CREATE TABLE IF NOT EXISTS tm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. TM Comments
CREATE TABLE IF NOT EXISTS tm_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tm_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22. Audit Log
CREATE TABLE IF NOT EXISTS tm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action tm_audit_action NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. Notifications
CREATE TABLE IF NOT EXISTS tm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type tm_notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 24. User Presence
CREATE TABLE IF NOT EXISTS tm_user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(50),
  entity_id UUID,
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id, entity_type, entity_id)
);

-- 25. Saved Filters
CREATE TABLE IF NOT EXISTS tm_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  filter_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26. Key Sequences
CREATE TABLE IF NOT EXISTS tm_key_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  prefix VARCHAR(10) NOT NULL,
  current_value INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, prefix)
);

-- 27. Permissions
CREATE TABLE IF NOT EXISTS tm_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES tm_roles(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_key)
);

-- 28. Test Case Templates
CREATE TABLE IF NOT EXISTS tm_test_case_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_global BOOLEAN DEFAULT false,
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 29. Template Categories
CREATE TABLE IF NOT EXISTS tm_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK after both tables exist
ALTER TABLE tm_test_case_templates 
  DROP CONSTRAINT IF EXISTS tm_test_case_templates_category_id_fkey;
ALTER TABLE tm_test_case_templates 
  ADD CONSTRAINT tm_test_case_templates_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES tm_template_categories(id) ON DELETE SET NULL;

-- 30. AI Usage Log
CREATE TABLE IF NOT EXISTS tm_ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  model VARCHAR(50),
  tokens_used INTEGER,
  request_data JSONB,
  response_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 31. AI Embeddings
CREATE TABLE IF NOT EXISTS tm_ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  embedding_data JSONB,
  model VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- 1. Auto-update timestamp
CREATE OR REPLACE FUNCTION tm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Generate entity keys (TC-001, CY-001, etc.)
CREATE OR REPLACE FUNCTION tm_next_entity_key(p_project_id UUID, p_prefix VARCHAR(10))
RETURNS VARCHAR(20) AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO tm_key_sequences (project_id, prefix, current_value)
  VALUES (p_project_id, p_prefix, 1)
  ON CONFLICT (project_id, prefix) 
  DO UPDATE SET current_value = tm_key_sequences.current_value + 1, updated_at = now()
  RETURNING current_value INTO v_next;
  
  RETURN p_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Calculate run status from step results
CREATE OR REPLACE FUNCTION tm_calculate_run_status(p_run_id UUID)
RETURNS tm_execution_status AS $$
DECLARE
  v_status tm_execution_status;
BEGIN
  SELECT 
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'blocked') > 0 THEN 'blocked'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'in_progress') > 0 THEN 'in_progress'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'not_run') = COUNT(*) THEN 'not_run'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status IN ('passed', 'skipped')) = COUNT(*) THEN 'passed'::tm_execution_status
      ELSE 'in_progress'::tm_execution_status
    END INTO v_status
  FROM tm_step_results
  WHERE test_run_id = p_run_id;
  
  RETURN COALESCE(v_status, 'not_run');
END;
$$ LANGUAGE plpgsql;

-- 4. Update cycle statistics
CREATE OR REPLACE FUNCTION tm_update_cycle_stats(p_cycle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tm_test_cycles SET
    total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id),
    passed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'passed'),
    failed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'failed'),
    blocked_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'blocked'),
    skipped_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'skipped'),
    not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'not_run'),
    updated_at = now()
  WHERE id = p_cycle_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Update folder case counts
CREATE OR REPLACE FUNCTION tm_update_folder_counts(p_folder_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_folder_id IS NOT NULL THEN
    UPDATE tm_folders SET
      case_count = (SELECT COUNT(*) FROM tm_test_cases WHERE folder_id = p_folder_id),
      updated_at = now()
    WHERE id = p_folder_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Check circular folder reference
CREATE OR REPLACE FUNCTION tm_check_circular_folder(p_folder_id UUID, p_new_parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_id UUID;
BEGIN
  IF p_new_parent_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_folder_id = p_new_parent_id THEN
    RETURN TRUE;
  END IF;
  
  v_current_id := p_new_parent_id;
  WHILE v_current_id IS NOT NULL LOOP
    IF v_current_id = p_folder_id THEN
      RETURN TRUE;
    END IF;
    SELECT parent_id INTO v_current_id FROM tm_folders WHERE id = v_current_id;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS tm_projects_updated_at ON tm_projects;
CREATE TRIGGER tm_projects_updated_at BEFORE UPDATE ON tm_projects
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_folders_updated_at ON tm_folders;
CREATE TRIGGER tm_folders_updated_at BEFORE UPDATE ON tm_folders
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_cases_updated_at ON tm_test_cases;
CREATE TRIGGER tm_test_cases_updated_at BEFORE UPDATE ON tm_test_cases
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_steps_updated_at ON tm_test_steps;
CREATE TRIGGER tm_test_steps_updated_at BEFORE UPDATE ON tm_test_steps
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_cycles_updated_at ON tm_test_cycles;
CREATE TRIGGER tm_test_cycles_updated_at BEFORE UPDATE ON tm_test_cycles
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_runs_updated_at ON tm_test_runs;
CREATE TRIGGER tm_test_runs_updated_at BEFORE UPDATE ON tm_test_runs
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_step_results_updated_at ON tm_step_results;
CREATE TRIGGER tm_step_results_updated_at BEFORE UPDATE ON tm_step_results
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_defects_updated_at ON tm_defects;
CREATE TRIGGER tm_defects_updated_at BEFORE UPDATE ON tm_defects
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_environments_updated_at ON tm_environments;
CREATE TRIGGER tm_environments_updated_at BEFORE UPDATE ON tm_environments
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_sets_updated_at ON tm_test_sets;
CREATE TRIGGER tm_test_sets_updated_at BEFORE UPDATE ON tm_test_sets
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_comments_updated_at ON tm_comments;
CREATE TRIGGER tm_comments_updated_at BEFORE UPDATE ON tm_comments
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_saved_filters_updated_at ON tm_saved_filters;
CREATE TRIGGER tm_saved_filters_updated_at BEFORE UPDATE ON tm_saved_filters
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_test_case_templates_updated_at ON tm_test_case_templates;
CREATE TRIGGER tm_test_case_templates_updated_at BEFORE UPDATE ON tm_test_case_templates
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

DROP TRIGGER IF EXISTS tm_ai_embeddings_updated_at ON tm_ai_embeddings;
CREATE TRIGGER tm_ai_embeddings_updated_at BEFORE UPDATE ON tm_ai_embeddings
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();

-- Folder counts trigger function
CREATE OR REPLACE FUNCTION tm_trigger_update_folder_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM tm_update_folder_counts(OLD.folder_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM tm_update_folder_counts(NEW.folder_id);
    RETURN NEW;
  ELSE
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      PERFORM tm_update_folder_counts(OLD.folder_id);
      PERFORM tm_update_folder_counts(NEW.folder_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tm_test_cases_folder_counts ON tm_test_cases;
CREATE TRIGGER tm_test_cases_folder_counts
  AFTER INSERT OR UPDATE OF folder_id OR DELETE ON tm_test_cases
  FOR EACH ROW EXECUTE FUNCTION tm_trigger_update_folder_counts();

-- Step results percolation trigger
CREATE OR REPLACE FUNCTION tm_trigger_step_results_percolate()
RETURNS TRIGGER AS $$
DECLARE
  v_run_status tm_execution_status;
  v_scope_id UUID;
BEGIN
  v_run_status := tm_calculate_run_status(NEW.test_run_id);
  
  UPDATE tm_test_runs SET status = v_run_status, updated_at = now()
  WHERE id = NEW.test_run_id
  RETURNING cycle_scope_id INTO v_scope_id;
  
  UPDATE tm_cycle_scope SET current_status = v_run_status
  WHERE id = v_scope_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tm_step_results_percolate ON tm_step_results;
CREATE TRIGGER tm_step_results_percolate
  AFTER UPDATE OF status ON tm_step_results
  FOR EACH ROW EXECUTE FUNCTION tm_trigger_step_results_percolate();

-- Cycle scope stats trigger
CREATE OR REPLACE FUNCTION tm_trigger_cycle_scope_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM tm_update_cycle_stats(OLD.cycle_id);
    RETURN OLD;
  ELSE
    PERFORM tm_update_cycle_stats(NEW.cycle_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tm_cycle_scope_stats ON tm_cycle_scope;
CREATE TRIGGER tm_cycle_scope_stats
  AFTER INSERT OR UPDATE OF current_status OR DELETE ON tm_cycle_scope
  FOR EACH ROW EXECUTE FUNCTION tm_trigger_cycle_scope_stats();

-- =====================================================
-- INDEXES
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_project_folder ON tm_test_cases(project_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_project_status ON tm_test_cases(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_scope_cycle_status ON tm_cycle_scope(cycle_id, current_status);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_scope_assigned ON tm_cycle_scope(assigned_to, current_status);
CREATE INDEX IF NOT EXISTS idx_tm_test_runs_scope ON tm_test_runs(cycle_scope_id, status);
CREATE INDEX IF NOT EXISTS idx_tm_step_results_run ON tm_step_results(test_run_id, status);
CREATE INDEX IF NOT EXISTS idx_tm_defects_project_status ON tm_defects(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tm_audit_log_entity ON tm_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tm_audit_log_project ON tm_audit_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tm_notifications_user ON tm_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tm_attachments_entity ON tm_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tm_comments_entity ON tm_comments(entity_type, entity_id);

-- GIST index for LTREE folder paths
CREATE INDEX IF NOT EXISTS idx_tm_folders_path ON tm_folders USING GIST (path);

-- GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_title_gin ON tm_test_cases USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tm_defects_title_gin ON tm_defects USING GIN (to_tsvector('english', title));

-- =====================================================
-- VIEWS
-- =====================================================

-- v_tm_test_cases_full
CREATE OR REPLACE VIEW v_tm_test_cases_full AS
SELECT 
  tc.*,
  p.name AS project_name,
  p.key AS project_key,
  f.name AS folder_name,
  f.path AS folder_path,
  cp.name AS priority_name,
  cp.color AS priority_color,
  ct.name AS type_name,
  ct.color AS type_color,
  creator.full_name AS created_by_name,
  COALESCE(
    (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
     FROM tm_case_labels cl JOIN tm_labels l ON cl.label_id = l.id
     WHERE cl.test_case_id = tc.id), '[]'::json
  ) AS labels,
  (SELECT COUNT(*) FROM tm_test_steps WHERE test_case_id = tc.id) AS step_count
FROM tm_test_cases tc
LEFT JOIN tm_projects p ON tc.project_id = p.id
LEFT JOIN tm_folders f ON tc.folder_id = f.id
LEFT JOIN tm_case_priorities cp ON tc.priority_id = cp.id
LEFT JOIN tm_case_types ct ON tc.case_type_id = ct.id
LEFT JOIN profiles creator ON tc.created_by = creator.id;

-- v_tm_cycle_progress
CREATE OR REPLACE VIEW v_tm_cycle_progress AS
SELECT 
  c.*,
  p.name AS project_name,
  p.key AS project_key,
  e.name AS environment_name,
  creator.full_name AS created_by_name,
  CASE 
    WHEN c.total_cases = 0 THEN 0
    ELSE ROUND(((c.passed_count + c.skipped_count)::NUMERIC / c.total_cases) * 100, 2)
  END AS progress_percent,
  CASE
    WHEN c.status = 'completed' THEN 'completed'
    WHEN c.planned_end < now() AND c.status != 'completed' THEN 'overdue'
    WHEN c.planned_start > now() THEN 'upcoming'
    ELSE 'on_track'
  END AS schedule_status
FROM tm_test_cycles c
LEFT JOIN tm_projects p ON c.project_id = p.id
LEFT JOIN tm_environments e ON c.environment_id = e.id
LEFT JOIN profiles creator ON c.created_by = creator.id;

-- v_tm_execution_by_assignee
CREATE OR REPLACE VIEW v_tm_execution_by_assignee AS
SELECT 
  cs.assigned_to AS user_id,
  u.full_name AS assignee_name,
  c.id AS cycle_id,
  c.name AS cycle_name,
  c.project_id,
  COUNT(*) AS total_assigned,
  COUNT(*) FILTER (WHERE cs.current_status = 'passed') AS passed,
  COUNT(*) FILTER (WHERE cs.current_status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE cs.current_status = 'blocked') AS blocked,
  COUNT(*) FILTER (WHERE cs.current_status = 'not_run') AS not_run,
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE cs.current_status NOT IN ('not_run', 'in_progress'))::NUMERIC / COUNT(*)) * 100, 2)
  END AS completion_percent
FROM tm_cycle_scope cs
JOIN tm_test_cycles c ON cs.cycle_id = c.id
LEFT JOIN profiles u ON cs.assigned_to = u.id
WHERE cs.assigned_to IS NOT NULL
GROUP BY cs.assigned_to, u.full_name, c.id, c.name, c.project_id;

-- v_tm_traceability_summary
CREATE OR REPLACE VIEW v_tm_traceability_summary AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.key AS project_key,
  (SELECT COUNT(*) FROM tm_test_cases WHERE project_id = p.id) AS total_cases,
  (SELECT COUNT(*) FROM tm_test_cases WHERE project_id = p.id AND status = 'approved') AS approved_cases,
  (SELECT COUNT(*) FROM tm_test_cycles WHERE project_id = p.id) AS total_cycles,
  (SELECT COUNT(*) FROM tm_test_cycles WHERE project_id = p.id AND status = 'completed') AS completed_cycles,
  (SELECT COUNT(*) FROM tm_defects WHERE project_id = p.id AND status = 'open') AS open_defects
FROM tm_projects p
WHERE p.is_active = true;

-- v_tm_my_work
CREATE OR REPLACE VIEW v_tm_my_work AS
SELECT 
  cs.assigned_to AS user_id,
  'cycle_scope' AS work_type,
  cs.id AS item_id,
  tc.case_key AS item_key,
  tc.title AS item_title,
  cs.current_status AS status,
  c.name AS context_name,
  c.id AS context_id,
  c.planned_end AS due_date,
  CASE
    WHEN c.planned_end < now() THEN 'overdue'
    WHEN c.planned_end < now() + INTERVAL '2 days' THEN 'due_soon'
    ELSE 'normal'
  END AS urgency,
  cs.added_at AS assigned_at
FROM tm_cycle_scope cs
JOIN tm_test_cycles c ON cs.cycle_id = c.id
JOIN tm_test_cases tc ON cs.test_case_id = tc.id
WHERE cs.current_status IN ('not_run', 'in_progress', 'blocked')
  AND c.status IN ('planned', 'in_progress');

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on key tables
ALTER TABLE tm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check project access
CREATE OR REPLACE FUNCTION tm_user_has_access(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tm_user_roles 
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Projects policies
DROP POLICY IF EXISTS tm_projects_select ON tm_projects;
CREATE POLICY tm_projects_select ON tm_projects FOR SELECT
  USING (tm_user_has_access(auth.uid(), id) OR is_active = true);

DROP POLICY IF EXISTS tm_projects_insert ON tm_projects;
CREATE POLICY tm_projects_insert ON tm_projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tm_projects_update ON tm_projects;
CREATE POLICY tm_projects_update ON tm_projects FOR UPDATE
  USING (tm_user_has_access(auth.uid(), id));

-- Test cases policies
DROP POLICY IF EXISTS tm_test_cases_select ON tm_test_cases;
CREATE POLICY tm_test_cases_select ON tm_test_cases FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cases_insert ON tm_test_cases;
CREATE POLICY tm_test_cases_insert ON tm_test_cases FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cases_update ON tm_test_cases;
CREATE POLICY tm_test_cases_update ON tm_test_cases FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cases_delete ON tm_test_cases;
CREATE POLICY tm_test_cases_delete ON tm_test_cases FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Test cycles policies
DROP POLICY IF EXISTS tm_test_cycles_select ON tm_test_cycles;
CREATE POLICY tm_test_cycles_select ON tm_test_cycles FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cycles_insert ON tm_test_cycles;
CREATE POLICY tm_test_cycles_insert ON tm_test_cycles FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cycles_update ON tm_test_cycles;
CREATE POLICY tm_test_cycles_update ON tm_test_cycles FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_test_cycles_delete ON tm_test_cycles;
CREATE POLICY tm_test_cycles_delete ON tm_test_cycles FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Defects policies
DROP POLICY IF EXISTS tm_defects_select ON tm_defects;
CREATE POLICY tm_defects_select ON tm_defects FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_defects_insert ON tm_defects;
CREATE POLICY tm_defects_insert ON tm_defects FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_defects_update ON tm_defects;
CREATE POLICY tm_defects_update ON tm_defects FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_defects_delete ON tm_defects;
CREATE POLICY tm_defects_delete ON tm_defects FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Notifications policies
DROP POLICY IF EXISTS tm_notifications_select ON tm_notifications;
CREATE POLICY tm_notifications_select ON tm_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tm_notifications_update ON tm_notifications;
CREATE POLICY tm_notifications_update ON tm_notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tm_notifications_delete ON tm_notifications;
CREATE POLICY tm_notifications_delete ON tm_notifications FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default roles
INSERT INTO tm_roles (name, description, is_system) VALUES
  ('admin', 'Full access to all features', true),
  ('test_lead', 'Manage test cycles and assignments', true),
  ('tester', 'Execute tests and report defects', true),
  ('viewer', 'Read-only access', true)
ON CONFLICT (name) DO NOTHING;

-- Default permissions for roles
INSERT INTO tm_permissions (role_id, permission_key, granted)
SELECT r.id, p.key, true
FROM tm_roles r
CROSS JOIN (VALUES 
  ('cases.create'), ('cases.read'), ('cases.update'), ('cases.delete'),
  ('cycles.create'), ('cycles.read'), ('cycles.update'), ('cycles.delete'),
  ('runs.execute'), ('runs.read'),
  ('defects.create'), ('defects.read'), ('defects.update'),
  ('settings.read'), ('settings.update')
) AS p(key)
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Default template categories
INSERT INTO tm_template_categories (name, description, sort_order) VALUES
  ('Functional', 'Standard functional test templates', 1),
  ('API', 'REST/GraphQL API testing templates', 2),
  ('UI/UX', 'User interface testing templates', 3),
  ('Performance', 'Load and performance test templates', 4),
  ('Security', 'Security testing templates', 5)
ON CONFLICT DO NOTHING;