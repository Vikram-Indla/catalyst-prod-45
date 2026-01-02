-- =============================================================================
-- WORKFLOW ENGINE TABLES
-- =============================================================================

-- Enum for condition types
CREATE TYPE injira_condition_type AS ENUM (
  'user_in_group',
  'user_in_role', 
  'user_is_assignee',
  'user_is_reporter',
  'field_required',
  'field_value_equals',
  'field_value_not_empty',
  'previous_status',
  'sub_tasks_resolved',
  'parent_status',
  'permission_check',
  'custom_script'
);

-- Enum for validator types
CREATE TYPE injira_validator_type AS ENUM (
  'field_required',
  'field_has_value',
  'field_regex',
  'field_min_length',
  'field_max_length',
  'field_number_range',
  'date_compare',
  'user_permission',
  'custom_script'
);

-- Enum for post-function types
CREATE TYPE injira_postfunction_type AS ENUM (
  'set_field_value',
  'copy_field_value',
  'clear_field_value',
  'assign_to_user',
  'assign_to_reporter',
  'assign_to_lead',
  'add_comment',
  'add_label',
  'remove_label',
  'update_parent',
  'fire_event',
  'send_notification',
  'trigger_webhook',
  'custom_script'
);

-- =============================================================================
-- WORKFLOWS TABLE
-- =============================================================================
CREATE TABLE injira_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  initial_status_id UUID REFERENCES injira_statuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(tenant_id, name)
);

-- =============================================================================
-- WORKFLOW TRANSITIONS TABLE
-- =============================================================================
CREATE TABLE injira_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  workflow_id UUID NOT NULL REFERENCES injira_workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  from_status_id UUID REFERENCES injira_statuses(id) ON DELETE CASCADE,
  to_status_id UUID NOT NULL REFERENCES injira_statuses(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  is_initial BOOLEAN DEFAULT false,
  button_text TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  screen_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_transition CHECK (
    (is_initial = true AND from_status_id IS NULL) OR 
    (is_initial = false)
  )
);

-- =============================================================================
-- TRANSITION CONDITIONS TABLE
-- =============================================================================
CREATE TABLE injira_transition_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  transition_id UUID NOT NULL REFERENCES injira_workflow_transitions(id) ON DELETE CASCADE,
  condition_type injira_condition_type NOT NULL,
  config_json JSONB DEFAULT '{}',
  negate BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  group_id TEXT,
  group_operator TEXT DEFAULT 'AND',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- TRANSITION VALIDATORS TABLE
-- =============================================================================
CREATE TABLE injira_transition_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  transition_id UUID NOT NULL REFERENCES injira_workflow_transitions(id) ON DELETE CASCADE,
  validator_type injira_validator_type NOT NULL,
  config_json JSONB DEFAULT '{}',
  error_message TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- TRANSITION POST-FUNCTIONS TABLE
-- =============================================================================
CREATE TABLE injira_transition_postfunctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  transition_id UUID NOT NULL REFERENCES injira_workflow_transitions(id) ON DELETE CASCADE,
  function_type injira_postfunction_type NOT NULL,
  config_json JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  run_as_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- WORKFLOW SCHEME TABLE (maps project + issue type to workflow)
-- =============================================================================
CREATE TABLE injira_workflow_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE injira_workflow_scheme_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  scheme_id UUID NOT NULL REFERENCES injira_workflow_schemes(id) ON DELETE CASCADE,
  issue_type_id UUID REFERENCES injira_issue_types(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES injira_workflows(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheme_id, issue_type_id)
);

-- =============================================================================
-- ISSUE TYPE SCHEME TABLE
-- =============================================================================
CREATE TABLE injira_issue_type_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE injira_issue_type_scheme_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  scheme_id UUID NOT NULL REFERENCES injira_issue_type_schemes(id) ON DELETE CASCADE,
  issue_type_id UUID NOT NULL REFERENCES injira_issue_types(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheme_id, issue_type_id)
);

-- =============================================================================
-- SCREEN SCHEME TABLE
-- =============================================================================
CREATE TABLE injira_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE injira_screen_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  screen_id UUID NOT NULL REFERENCES injira_screens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE injira_screen_tab_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  tab_id UUID NOT NULL REFERENCES injira_screen_tabs(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE injira_screen_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE injira_screen_scheme_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  scheme_id UUID NOT NULL REFERENCES injira_screen_schemes(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'edit', 'view')),
  screen_id UUID NOT NULL REFERENCES injira_screens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheme_id, operation)
);

-- =============================================================================
-- ISSUE TYPE SCREEN SCHEME TABLE
-- =============================================================================
CREATE TABLE injira_issue_type_screen_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE injira_issue_type_screen_scheme_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  scheme_id UUID NOT NULL REFERENCES injira_issue_type_screen_schemes(id) ON DELETE CASCADE,
  issue_type_id UUID REFERENCES injira_issue_types(id) ON DELETE CASCADE,
  screen_scheme_id UUID NOT NULL REFERENCES injira_screen_schemes(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheme_id, issue_type_id)
);

-- =============================================================================
-- WORKFLOW TRANSITION LOG (audit trail)
-- =============================================================================
CREATE TABLE injira_workflow_transition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE RESTRICT,
  issue_id UUID NOT NULL REFERENCES injira_issues(id) ON DELETE CASCADE,
  transition_id UUID REFERENCES injira_workflow_transitions(id) ON DELETE SET NULL,
  from_status_id UUID REFERENCES injira_statuses(id) ON DELETE SET NULL,
  to_status_id UUID NOT NULL REFERENCES injira_statuses(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL,
  transition_name TEXT,
  duration_seconds INT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- PROJECT SCHEME ASSOCIATIONS
-- =============================================================================
ALTER TABLE injira_projects ADD COLUMN IF NOT EXISTS workflow_scheme_id UUID REFERENCES injira_workflow_schemes(id) ON DELETE SET NULL;
ALTER TABLE injira_projects ADD COLUMN IF NOT EXISTS issue_type_scheme_id UUID REFERENCES injira_issue_type_schemes(id) ON DELETE SET NULL;
ALTER TABLE injira_projects ADD COLUMN IF NOT EXISTS issue_type_screen_scheme_id UUID REFERENCES injira_issue_type_screen_schemes(id) ON DELETE SET NULL;

-- Link screen to transition
ALTER TABLE injira_workflow_transitions ADD CONSTRAINT fk_transition_screen 
  FOREIGN KEY (screen_id) REFERENCES injira_screens(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_workflows_tenant ON injira_workflows(tenant_id);
CREATE INDEX idx_workflows_active ON injira_workflows(tenant_id, is_active) WHERE is_active = true;

CREATE INDEX idx_workflow_transitions_workflow ON injira_workflow_transitions(workflow_id);
CREATE INDEX idx_workflow_transitions_from_status ON injira_workflow_transitions(from_status_id);
CREATE INDEX idx_workflow_transitions_to_status ON injira_workflow_transitions(to_status_id);

CREATE INDEX idx_transition_conditions_transition ON injira_transition_conditions(transition_id);
CREATE INDEX idx_transition_validators_transition ON injira_transition_validators(transition_id);
CREATE INDEX idx_transition_postfunctions_transition ON injira_transition_postfunctions(transition_id);

CREATE INDEX idx_workflow_scheme_mappings_scheme ON injira_workflow_scheme_mappings(scheme_id);
CREATE INDEX idx_workflow_scheme_mappings_workflow ON injira_workflow_scheme_mappings(workflow_id);

CREATE INDEX idx_issue_type_scheme_mappings_scheme ON injira_issue_type_scheme_mappings(scheme_id);

CREATE INDEX idx_screen_tabs_screen ON injira_screen_tabs(screen_id);
CREATE INDEX idx_screen_tab_fields_tab ON injira_screen_tab_fields(tab_id);
CREATE INDEX idx_screen_scheme_mappings_scheme ON injira_screen_scheme_mappings(scheme_id);

CREATE INDEX idx_transition_logs_issue ON injira_workflow_transition_logs(issue_id);
CREATE INDEX idx_transition_logs_created ON injira_workflow_transition_logs(created_at);

-- =============================================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- =============================================================================
CREATE TRIGGER update_injira_workflows_updated_at
  BEFORE UPDATE ON injira_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

CREATE TRIGGER update_injira_workflow_schemes_updated_at
  BEFORE UPDATE ON injira_workflow_schemes
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

CREATE TRIGGER update_injira_issue_type_schemes_updated_at
  BEFORE UPDATE ON injira_issue_type_schemes
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

CREATE TRIGGER update_injira_screens_updated_at
  BEFORE UPDATE ON injira_screens
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

CREATE TRIGGER update_injira_screen_schemes_updated_at
  BEFORE UPDATE ON injira_screen_schemes
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

CREATE TRIGGER update_injira_issue_type_screen_schemes_updated_at
  BEFORE UPDATE ON injira_issue_type_screen_schemes
  FOR EACH ROW
  EXECUTE FUNCTION update_injira_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE injira_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_transition_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_transition_validators ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_transition_postfunctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_workflow_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_workflow_scheme_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_issue_type_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_issue_type_scheme_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_screen_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_screen_tab_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_screen_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_screen_scheme_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_issue_type_screen_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_issue_type_screen_scheme_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE injira_workflow_transition_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Workflows visible to authenticated" ON injira_workflows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workflow transitions visible to authenticated" ON injira_workflow_transitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Transition conditions visible to authenticated" ON injira_transition_conditions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Transition validators visible to authenticated" ON injira_transition_validators
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Transition postfunctions visible to authenticated" ON injira_transition_postfunctions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workflow schemes visible to authenticated" ON injira_workflow_schemes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workflow scheme mappings visible to authenticated" ON injira_workflow_scheme_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Issue type schemes visible to authenticated" ON injira_issue_type_schemes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Issue type scheme mappings visible to authenticated" ON injira_issue_type_scheme_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screens visible to authenticated" ON injira_screens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screen tabs visible to authenticated" ON injira_screen_tabs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screen tab fields visible to authenticated" ON injira_screen_tab_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screen schemes visible to authenticated" ON injira_screen_schemes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screen scheme mappings visible to authenticated" ON injira_screen_scheme_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Issue type screen schemes visible to authenticated" ON injira_issue_type_screen_schemes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Issue type screen scheme mappings visible to authenticated" ON injira_issue_type_screen_scheme_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Transition logs visible to authenticated" ON injira_workflow_transition_logs
  FOR SELECT TO authenticated USING (true);

-- Insert/update/delete policies for admins (via service role)
CREATE POLICY "Admins can manage workflows" ON injira_workflows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage workflow transitions" ON injira_workflow_transitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage transition conditions" ON injira_transition_conditions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage transition validators" ON injira_transition_validators
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage transition postfunctions" ON injira_transition_postfunctions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage workflow schemes" ON injira_workflow_schemes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage workflow scheme mappings" ON injira_workflow_scheme_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage issue type schemes" ON injira_issue_type_schemes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage issue type scheme mappings" ON injira_issue_type_scheme_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage screens" ON injira_screens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage screen tabs" ON injira_screen_tabs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage screen tab fields" ON injira_screen_tab_fields
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage screen schemes" ON injira_screen_schemes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage screen scheme mappings" ON injira_screen_scheme_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage issue type screen schemes" ON injira_issue_type_screen_schemes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage issue type screen scheme mappings" ON injira_issue_type_screen_scheme_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service can log transitions" ON injira_workflow_transition_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
