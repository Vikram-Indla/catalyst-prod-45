-- =====================================================
-- IN-JIRA MODULE - COMPLETE DATA MODEL
-- Jira-class Project Execution Backend
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE injira_issue_type_category AS ENUM ('feature', 'story', 'subtask', 'defect', 'incident');
CREATE TYPE injira_status_category AS ENUM ('to_do', 'in_progress', 'done');
CREATE TYPE injira_board_type AS ENUM ('kanban', 'scrum');
CREATE TYPE injira_sprint_state AS ENUM ('future', 'active', 'closed');
CREATE TYPE injira_import_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE injira_permission_type AS ENUM ('browse', 'create', 'edit', 'delete', 'assign', 'transition', 'comment', 'attach', 'manage');
CREATE TYPE injira_webhook_event AS ENUM ('issue_created', 'issue_updated', 'issue_deleted', 'sprint_started', 'sprint_closed', 'version_released');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Tenant (multi-tenancy support)
CREATE TABLE public.injira_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project (Jira project container)
CREATE TABLE public.injira_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lead_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  default_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  category TEXT,
  project_type TEXT DEFAULT 'software',
  settings JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, key)
);

-- Issue Type Definition
CREATE TABLE public.injira_issue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT,
  category injira_issue_type_category NOT NULL,
  is_subtask BOOLEAN DEFAULT false,
  hierarchy_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Status Definition
CREATE TABLE public.injira_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  category injira_status_category NOT NULL,
  color TEXT,
  icon TEXT,
  is_initial BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Resolution Definition
CREATE TABLE public.injira_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- =====================================================
-- ISSUE TABLE (Core work item)
-- =====================================================

CREATE TABLE public.injira_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE RESTRICT,
  
  -- Issue identification
  key TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  
  -- Classification
  issue_type_id UUID NOT NULL REFERENCES public.injira_issue_types(id) ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES public.injira_statuses(id) ON DELETE RESTRICT,
  resolution_id UUID REFERENCES public.injira_resolutions(id) ON DELETE SET NULL,
  
  -- Content
  summary TEXT NOT NULL,
  description JSONB, -- ADF (Atlassian Document Format) JSON
  
  -- Hierarchy links (STRICT ENFORCEMENT)
  parent_id UUID REFERENCES public.injira_issues(id) ON DELETE RESTRICT, -- Sub-task → Story only
  parent_feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL, -- Story → Feature
  program_epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL, -- Links to Program Epic
  
  -- Assignment
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Priority & Planning
  priority TEXT DEFAULT 'medium',
  story_points DECIMAL(5,2),
  original_estimate_seconds BIGINT,
  remaining_estimate_seconds BIGINT,
  time_spent_seconds BIGINT DEFAULT 0,
  
  -- Sprint & Version
  sprint_id UUID, -- FK added after sprint table
  
  -- Dates
  due_date DATE,
  start_date DATE,
  resolved_at TIMESTAMPTZ,
  
  -- Ranking (Lexorank for efficient reordering)
  rank_lexo TEXT,
  
  -- Labels & Components
  labels TEXT[] DEFAULT '{}',
  components TEXT[] DEFAULT '{}',
  
  -- Security
  security_level_id UUID, -- FK added after security table
  
  -- Optimistic locking
  optimistic_lock_version INTEGER DEFAULT 1,
  
  -- Metadata
  environment TEXT,
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, key),
  UNIQUE(project_id, issue_number)
);

-- =====================================================
-- BOARD & SPRINT TABLES
-- =====================================================

-- Board Configuration
CREATE TABLE public.injira_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  board_type injira_board_type NOT NULL,
  filter_jql TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Board Columns
CREATE TABLE public.injira_board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.injira_boards(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status_ids UUID[] NOT NULL DEFAULT '{}', -- Maps to multiple statuses
  min_limit INTEGER,
  max_limit INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sprint
CREATE TABLE public.injira_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.injira_boards(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  goal TEXT,
  state injira_sprint_state NOT NULL DEFAULT 'future',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  complete_date TIMESTAMPTZ,
  velocity INTEGER,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add FK from issue to sprint
ALTER TABLE public.injira_issues 
  ADD CONSTRAINT injira_issues_sprint_fk 
  FOREIGN KEY (sprint_id) REFERENCES public.injira_sprints(id) ON DELETE SET NULL;

-- =====================================================
-- VERSION (Release) TABLES
-- =====================================================

-- Version/Release
CREATE TABLE public.injira_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  release_date DATE,
  released BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(project_id, name)
);

-- Issue-Version junction (many-to-many: fix versions, affects versions)
CREATE TABLE public.injira_issue_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE RESTRICT,
  version_id UUID NOT NULL REFERENCES public.injira_versions(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL DEFAULT 'fix', -- 'fix' or 'affects'
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(issue_id, version_id, relation_type)
);

-- =====================================================
-- COLLABORATION TABLES
-- =====================================================

-- Comments (ADF JSON)
CREATE TABLE public.injira_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE RESTRICT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body JSONB NOT NULL, -- ADF format
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Attachments
CREATE TABLE public.injira_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE RESTRICT,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- CHANGELOG TABLES (Append-only audit trail)
-- =====================================================

-- Changelog Group (groups related changes in one transaction)
CREATE TABLE public.injira_changelog_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE RESTRICT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Changelog Items (individual field changes)
CREATE TABLE public.injira_changelog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  changelog_group_id UUID NOT NULL REFERENCES public.injira_changelog_groups(id) ON DELETE RESTRICT,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'jira', -- 'jira', 'custom'
  from_value TEXT,
  from_display TEXT,
  to_value TEXT,
  to_display TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PERMISSION & SECURITY TABLES
-- =====================================================

-- Permission Scheme
CREATE TABLE public.injira_permission_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Role Definition
CREATE TABLE public.injira_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Role Assignment (user → role in project)
CREATE TABLE public.injira_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE RESTRICT,
  role_id UUID NOT NULL REFERENCES public.injira_roles(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_name TEXT, -- Alternative to user_id
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT role_assignment_user_or_group CHECK (
    (user_id IS NOT NULL AND group_name IS NULL) OR
    (user_id IS NULL AND group_name IS NOT NULL)
  ),
  UNIQUE(project_id, role_id, user_id),
  UNIQUE(project_id, role_id, group_name)
);

-- Permission Grant (permission → role in scheme)
CREATE TABLE public.injira_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  scheme_id UUID NOT NULL REFERENCES public.injira_permission_schemes(id) ON DELETE CASCADE,
  permission injira_permission_type NOT NULL,
  role_id UUID REFERENCES public.injira_roles(id) ON DELETE CASCADE,
  group_name TEXT,
  anyone BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issue Security Level
CREATE TABLE public.injira_issue_security_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Add FK from issue to security level
ALTER TABLE public.injira_issues 
  ADD CONSTRAINT injira_issues_security_level_fk 
  FOREIGN KEY (security_level_id) REFERENCES public.injira_issue_security_levels(id) ON DELETE SET NULL;

-- =====================================================
-- AUTOMATION & INTEGRATION TABLES
-- =====================================================

-- Automation Rules
CREATE TABLE public.injira_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.injira_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_config JSONB NOT NULL,
  conditions_config JSONB DEFAULT '[]',
  actions_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Webhooks
CREATE TABLE public.injira_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.injira_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events injira_webhook_event[] NOT NULL,
  secret TEXT,
  is_enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- =====================================================
-- JIRA IMPORT TABLES
-- =====================================================

-- Import Job
CREATE TABLE public.injira_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.injira_projects(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'jira_cloud', -- 'jira_cloud', 'jira_server', 'csv'
  source_project_key TEXT,
  status injira_import_status NOT NULL DEFAULT 'pending',
  config JSONB DEFAULT '{}',
  progress_percent INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  imported_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Import Mapping (Jira ID → Catalyst ID)
CREATE TABLE public.injira_import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  import_job_id UUID NOT NULL REFERENCES public.injira_import_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'issue', 'status', 'user', 'version', etc.
  source_id TEXT NOT NULL, -- Jira ID
  target_id UUID NOT NULL, -- Catalyst ID
  source_key TEXT, -- Jira key (e.g., PROJ-123)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(import_job_id, entity_type, source_id)
);

-- Import Manifest (planned import structure)
CREATE TABLE public.injira_import_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  import_job_id UUID NOT NULL REFERENCES public.injira_import_jobs(id) ON DELETE CASCADE,
  manifest_json JSONB NOT NULL, -- Full import plan
  validation_errors JSONB DEFAULT '[]',
  is_valid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Import Diff Report
CREATE TABLE public.injira_import_diff_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  import_job_id UUID NOT NULL REFERENCES public.injira_import_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  diff_type TEXT NOT NULL, -- 'create', 'update', 'skip', 'error'
  source_data JSONB,
  target_data JSONB,
  diff_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- AI SUGGESTIONS TABLE
-- =====================================================

CREATE TABLE public.injira_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID REFERENCES public.injira_issues(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'priority', 'assignee', 'estimate', 'duplicate', 'label'
  suggestion_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  model_version TEXT,
  is_accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ISSUE HIERARCHY CONSTRAINT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_injira_issue_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_issue_type_category injira_issue_type_category;
  v_parent_type_category injira_issue_type_category;
BEGIN
  -- Get the issue type category
  SELECT category INTO v_issue_type_category
  FROM public.injira_issue_types
  WHERE id = NEW.issue_type_id;

  -- RULE 1: Sub-task MUST have parent_id (pointing to Story)
  IF v_issue_type_category = 'subtask' THEN
    IF NEW.parent_id IS NULL THEN
      RAISE EXCEPTION 'Sub-task must have a parent Story (parent_id required)';
    END IF;
    
    -- Validate parent is a Story
    SELECT it.category INTO v_parent_type_category
    FROM public.injira_issues i
    JOIN public.injira_issue_types it ON it.id = i.issue_type_id
    WHERE i.id = NEW.parent_id;
    
    IF v_parent_type_category != 'story' THEN
      RAISE EXCEPTION 'Sub-task parent must be a Story, not %', v_parent_type_category;
    END IF;
  END IF;

  -- RULE 2: Story MUST reference Feature (parent_feature_id)
  IF v_issue_type_category = 'story' THEN
    IF NEW.parent_feature_id IS NULL THEN
      RAISE EXCEPTION 'Story must reference a Feature (parent_feature_id required)';
    END IF;
    -- Story cannot have parent_id (only sub-tasks have parent_id)
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Story cannot have parent_id (only sub-tasks can)';
    END IF;
  END IF;

  -- RULE 3: Feature, Defect, Incident cannot have parent_id
  IF v_issue_type_category IN ('feature', 'defect', 'incident') THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION '% cannot have parent_id', v_issue_type_category;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_injira_issue_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.injira_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_injira_issue_hierarchy();

-- =====================================================
-- AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_injira_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables with updated_at
CREATE TRIGGER update_injira_tenants_updated_at BEFORE UPDATE ON public.injira_tenants FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_projects_updated_at BEFORE UPDATE ON public.injira_projects FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_issue_types_updated_at BEFORE UPDATE ON public.injira_issue_types FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_statuses_updated_at BEFORE UPDATE ON public.injira_statuses FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_issues_updated_at BEFORE UPDATE ON public.injira_issues FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_boards_updated_at BEFORE UPDATE ON public.injira_boards FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_board_columns_updated_at BEFORE UPDATE ON public.injira_board_columns FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_sprints_updated_at BEFORE UPDATE ON public.injira_sprints FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_versions_updated_at BEFORE UPDATE ON public.injira_versions FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_comments_updated_at BEFORE UPDATE ON public.injira_comments FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_permission_schemes_updated_at BEFORE UPDATE ON public.injira_permission_schemes FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_automation_rules_updated_at BEFORE UPDATE ON public.injira_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();
CREATE TRIGGER update_injira_webhooks_updated_at BEFORE UPDATE ON public.injira_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_injira_updated_at();

-- =====================================================
-- CHANGELOG TRIGGER (Append-only audit)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_injira_issue_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changelog_group_id UUID;
  v_field_changes JSONB;
BEGIN
  -- Skip if no actual changes
  IF OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;

  -- Create changelog group
  INSERT INTO public.injira_changelog_groups (tenant_id, issue_id, author_id)
  VALUES (NEW.tenant_id, NEW.id, auth.uid())
  RETURNING id INTO v_changelog_group_id;

  -- Log individual field changes
  IF OLD.summary IS DISTINCT FROM NEW.summary THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'summary', 'jira', OLD.summary, NEW.summary);
  END IF;

  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'status', 'jira', OLD.status_id::text, NEW.status_id::text);
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'assignee', 'jira', OLD.assignee_id::text, NEW.assignee_id::text);
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'priority', 'jira', OLD.priority, NEW.priority);
  END IF;

  IF OLD.sprint_id IS DISTINCT FROM NEW.sprint_id THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'sprint', 'jira', OLD.sprint_id::text, NEW.sprint_id::text);
  END IF;

  IF OLD.story_points IS DISTINCT FROM NEW.story_points THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'Story Points', 'jira', OLD.story_points::text, NEW.story_points::text);
  END IF;

  IF OLD.resolution_id IS DISTINCT FROM NEW.resolution_id THEN
    INSERT INTO public.injira_changelog_items (tenant_id, changelog_group_id, field_name, field_type, from_value, to_value)
    VALUES (NEW.tenant_id, v_changelog_group_id, 'resolution', 'jira', OLD.resolution_id::text, NEW.resolution_id::text);
  END IF;

  -- Increment optimistic lock version
  NEW.optimistic_lock_version := OLD.optimistic_lock_version + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_injira_issue_changes_trigger
  BEFORE UPDATE ON public.injira_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.log_injira_issue_changes();

-- =====================================================
-- ISSUE KEY AUTO-GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_injira_issue_key()
RETURNS TRIGGER AS $$
DECLARE
  v_project_key TEXT;
  v_next_number INTEGER;
BEGIN
  -- Get project key
  SELECT key INTO v_project_key
  FROM public.injira_projects
  WHERE id = NEW.project_id;

  -- Get next issue number for project
  SELECT COALESCE(MAX(issue_number), 0) + 1 INTO v_next_number
  FROM public.injira_issues
  WHERE project_id = NEW.project_id;

  NEW.issue_number := v_next_number;
  NEW.key := v_project_key || '-' || v_next_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_injira_issue_key_trigger
  BEFORE INSERT ON public.injira_issues
  FOR EACH ROW
  WHEN (NEW.key IS NULL)
  EXECUTE FUNCTION public.generate_injira_issue_key();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Issue list & board performance indexes
CREATE INDEX idx_injira_issues_project_status ON public.injira_issues(project_id, status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_project_sprint ON public.injira_issues(project_id, sprint_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_project_rank ON public.injira_issues(project_id, rank_lexo) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_assignee ON public.injira_issues(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_parent ON public.injira_issues(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_parent_feature ON public.injira_issues(parent_feature_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_program_epic ON public.injira_issues(program_epic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_key ON public.injira_issues(key) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_tenant_project ON public.injira_issues(tenant_id, project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_type_status ON public.injira_issues(issue_type_id, status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_labels ON public.injira_issues USING GIN(labels) WHERE deleted_at IS NULL;
CREATE INDEX idx_injira_issues_summary_trgm ON public.injira_issues USING GIN(summary gin_trgm_ops) WHERE deleted_at IS NULL;

-- Sprint indexes
CREATE INDEX idx_injira_sprints_board ON public.injira_sprints(board_id);
CREATE INDEX idx_injira_sprints_state ON public.injira_sprints(state);

-- Version indexes
CREATE INDEX idx_injira_versions_project ON public.injira_versions(project_id);
CREATE INDEX idx_injira_versions_released ON public.injira_versions(project_id, released);

-- Comment indexes
CREATE INDEX idx_injira_comments_issue ON public.injira_comments(issue_id);

-- Changelog indexes
CREATE INDEX idx_injira_changelog_groups_issue ON public.injira_changelog_groups(issue_id);
CREATE INDEX idx_injira_changelog_groups_created ON public.injira_changelog_groups(issue_id, created_at DESC);
CREATE INDEX idx_injira_changelog_items_group ON public.injira_changelog_items(changelog_group_id);

-- Import indexes
CREATE INDEX idx_injira_import_mappings_job ON public.injira_import_mappings(import_job_id);
CREATE INDEX idx_injira_import_mappings_source ON public.injira_import_mappings(import_job_id, entity_type, source_id);

-- AI suggestions index
CREATE INDEX idx_injira_ai_suggestions_issue ON public.injira_ai_suggestions(issue_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.injira_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_issue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_issue_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_changelog_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_changelog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_permission_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_issue_security_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_import_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_import_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_import_diff_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (approved users can read all in their tenant, write based on role)
CREATE POLICY "Approved users can view tenants" ON public.injira_tenants FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view projects" ON public.injira_projects FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage projects" ON public.injira_projects FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view issue types" ON public.injira_issue_types FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view statuses" ON public.injira_statuses FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view resolutions" ON public.injira_resolutions FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view issues" ON public.injira_issues FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage issues" ON public.injira_issues FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view boards" ON public.injira_boards FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage boards" ON public.injira_boards FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view board columns" ON public.injira_board_columns FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view sprints" ON public.injira_sprints FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage sprints" ON public.injira_sprints FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view versions" ON public.injira_versions FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage versions" ON public.injira_versions FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view issue versions" ON public.injira_issue_versions FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view comments" ON public.injira_comments FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can manage comments" ON public.injira_comments FOR ALL USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view attachments" ON public.injira_attachments FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view changelog groups" ON public.injira_changelog_groups FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view changelog items" ON public.injira_changelog_items FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view permission schemes" ON public.injira_permission_schemes FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view roles" ON public.injira_roles FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view role assignments" ON public.injira_role_assignments FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view permission grants" ON public.injira_permission_grants FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view security levels" ON public.injira_issue_security_levels FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view automation rules" ON public.injira_automation_rules FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view webhooks" ON public.injira_webhooks FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view import jobs" ON public.injira_import_jobs FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view import mappings" ON public.injira_import_mappings FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view import manifests" ON public.injira_import_manifests FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view import diff reports" ON public.injira_import_diff_reports FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Approved users can view AI suggestions" ON public.injira_ai_suggestions FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY "Admins can manage issue types" ON public.injira_issue_types FOR ALL USING (public.is_user_admin(auth.uid()));
CREATE POLICY "Admins can manage statuses" ON public.injira_statuses FOR ALL USING (public.is_user_admin(auth.uid()));
CREATE POLICY "Admins can manage resolutions" ON public.injira_resolutions FOR ALL USING (public.is_user_admin(auth.uid()));
CREATE POLICY "Admins can manage tenants" ON public.injira_tenants FOR ALL USING (public.is_user_admin(auth.uid()));