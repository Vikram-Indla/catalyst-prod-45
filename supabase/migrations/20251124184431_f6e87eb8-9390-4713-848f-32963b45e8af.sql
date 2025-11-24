-- ============================================================================
-- CATALYST ENTERPRISE AGILE PLATFORM - PHASE 1 SCHEMA
-- Jira Align-Inspired Platform with 5-Level Work Hierarchy
-- GUARDRAILS: NO Solution Layer, NO Capability Layer
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

CREATE TYPE portfolio_status AS ENUM ('active', 'archived');
CREATE TYPE program_status AS ENUM ('active', 'archived');
CREATE TYPE team_status AS ENUM ('active', 'archived');
CREATE TYPE pi_state AS ENUM ('planned', 'active', 'closed');
CREATE TYPE theme_status AS ENUM ('proposed', 'active', 'done', 'cancelled');
CREATE TYPE initiative_status AS ENUM ('proposed', 'active', 'done', 'cancelled');
CREATE TYPE br_status AS ENUM ('proposed', 'analyzing', 'approved', 'in_progress', 'done', 'cancelled');
CREATE TYPE epic_status AS ENUM ('proposed', 'analyzing', 'approved', 'in_progress', 'done', 'cancelled');
CREATE TYPE feature_status AS ENUM ('funnel', 'analyzing', 'backlog', 'implementing', 'done');
CREATE TYPE story_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE subtask_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE health_status AS ENUM ('green', 'yellow', 'red');
CREATE TYPE dependency_type AS ENUM ('sequential', 'concurrent');
CREATE TYPE dependency_status AS ENUM ('open', 'in_progress', 'done');
CREATE TYPE risk_level AS ENUM ('low', 'med', 'high');
CREATE TYPE roam_status AS ENUM ('resolved', 'owned', 'accepted', 'mitigated');
CREATE TYPE release_vehicle_type AS ENUM ('program', 'team', 'portfolio');
CREATE TYPE release_status AS ENUM ('planned', 'ready', 'shipped');
CREATE TYPE objective_scope_type AS ENUM ('company', 'portfolio', 'program');
CREATE TYPE confidence_level AS ENUM ('high', 'med', 'low');
CREATE TYPE board_scope_type AS ENUM ('portfolio', 'program', 'team');
CREATE TYPE board_type AS ENUM ('portfolio_kanban', 'program_board', 'sprint_board');
CREATE TYPE field_type AS ENUM ('text', 'number', 'date', 'select', 'multi_select', 'boolean');
CREATE TYPE permission_scope AS ENUM ('global', 'portfolio', 'program', 'team');
CREATE TYPE permission_action AS ENUM ('view', 'create', 'edit', 'delete', 'link', 'move', 'configure');
CREATE TYPE integration_type AS ENUM ('slack', 'github', 'gitlab', 'jira', 'teams', 'webhook');
CREATE TYPE auth_method AS ENUM ('token', 'oauth');
CREATE TYPE test_status AS ENUM ('never_tested', 'success', 'fail');

-- ============================================================================
-- SECTION 2: ORGANIZATION HIERARCHY (4 levels: Enterprise → Portfolio → Program → Team)
-- ============================================================================

-- Portfolios (Top-level org unit)
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  owner_id UUID,
  status portfolio_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (connects directly to Portfolio - NO Solution layer!)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rte_id UUID,
  status program_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, name)
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  velocity_baseline NUMERIC DEFAULT 0,
  status team_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, name)
);

-- ============================================================================
-- SECTION 3: PLANNING CADENCE
-- ============================================================================

-- Program Increments (PIs)
CREATE TABLE program_increments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  state pi_state DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, name)
);

-- Iterations (within PIs)
CREATE TABLE iterations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pi_id UUID NOT NULL REFERENCES program_increments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: STRATEGY HIERARCHY
-- ============================================================================

-- Strategic Themes
CREATE TABLE strategic_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status theme_status DEFAULT 'proposed',
  color_tag TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initiatives
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES strategic_themes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status initiative_status DEFAULT 'proposed',
  wsjf_score NUMERIC DEFAULT 0,
  benefit_score NUMERIC DEFAULT 0,
  target_pi_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Requests (Portfolio Epic bucket)
CREATE TABLE business_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID REFERENCES strategic_themes(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES initiatives(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status br_status DEFAULT 'proposed',
  estimate_swag NUMERIC,
  wsjf_score NUMERIC DEFAULT 0,
  health health_status DEFAULT 'green',
  target_pi_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: DELIVERY HIERARCHY (NO Capability layer!)
-- ============================================================================

-- Epics
CREATE TABLE epics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  br_id UUID REFERENCES business_requests(id) ON DELETE SET NULL,
  theme_id UUID REFERENCES strategic_themes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status epic_status DEFAULT 'proposed',
  estimate NUMERIC,
  start_date DATE,
  end_date DATE,
  health health_status DEFAULT 'green',
  primary_program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Features (connects directly to Epic - NO Capability layer!)
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  pi_id UUID REFERENCES program_increments(id) ON DELETE SET NULL,
  iteration_id UUID REFERENCES iterations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status feature_status DEFAULT 'funnel',
  estimate_points NUMERIC,
  wsjf_score NUMERIC DEFAULT 0,
  progress_pct NUMERIC DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  health health_status DEFAULT 'green',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  sprint_id UUID REFERENCES iterations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  assignee_id UUID,
  status story_status DEFAULT 'todo',
  estimate_points NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subtasks
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assignee_id UUID,
  status subtask_status DEFAULT 'todo',
  original_estimate_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: DEPENDENCIES & RISKS
-- ============================================================================

-- Dependencies (between Features)
CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  to_feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  type dependency_type DEFAULT 'sequential',
  status dependency_status DEFAULT 'open',
  risk_level risk_level DEFAULT 'low',
  due_iteration_id UUID REFERENCES iterations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_feature_id != to_feature_id)
);

-- Risks (ROAM board)
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES program_increments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  roam_status roam_status NOT NULL,
  probability INTEGER CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER CHECK (impact >= 1 AND impact <= 5),
  owner_id UUID,
  due_iteration_id UUID REFERENCES iterations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: CAPACITY & RELEASES
-- ============================================================================

-- Capacity Allocations
CREATE TABLE capacity_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  iteration_id UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  capacity_points NUMERIC DEFAULT 0,
  locked_baseline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, iteration_id)
);

-- Release Vehicles
CREATE TABLE release_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type release_vehicle_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Releases
CREATE TABLE releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_vehicle_id UUID NOT NULL REFERENCES release_vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_date DATE,
  status release_status DEFAULT 'planned',
  readiness_pct NUMERIC DEFAULT 0 CHECK (readiness_pct >= 0 AND readiness_pct <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Release Links
CREATE TABLE release_feature_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(release_id, feature_id)
);

CREATE TABLE release_story_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(release_id, story_id)
);

-- ============================================================================
-- SECTION 8: OKRs
-- ============================================================================

-- Objective Levels
CREATE TABLE objective_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type objective_scope_type NOT NULL,
  scope_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objectives
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_level_id UUID NOT NULL REFERENCES objective_levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_id UUID,
  start_date DATE,
  end_date DATE,
  progress_pct NUMERIC DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  confidence confidence_level DEFAULT 'med',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Results
CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKR Links
CREATE TABLE objective_theme_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES strategic_themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(objective_id, theme_id)
);

CREATE TABLE objective_initiative_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(objective_id, initiative_id)
);

-- ============================================================================
-- SECTION 9: ADMIN & CONFIGURATION
-- ============================================================================

-- Hierarchy Configuration
CREATE TABLE hierarchy_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Fields
CREATE TABLE custom_field_defs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type field_type NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  options_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_field_def_id UUID NOT NULL REFERENCES custom_field_defs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board Configuration
CREATE TABLE board_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type board_scope_type NOT NULL,
  scope_id UUID,
  board_type board_type NOT NULL,
  columns_json JSONB NOT NULL,
  swimlane_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE permission_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permission_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES permission_roles(id) ON DELETE CASCADE,
  scope_type permission_scope NOT NULL,
  scope_id UUID,
  entity_type TEXT NOT NULL,
  action permission_action NOT NULL,
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Connectors
CREATE TABLE integration_connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type integration_type NOT NULL,
  endpoint TEXT,
  auth_method auth_method,
  auth_config_json JSONB,
  enabled BOOLEAN DEFAULT FALSE,
  last_test_status test_status DEFAULT 'never_tested',
  last_test_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: AUDIT LOG
-- ============================================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 11: RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_feature_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_story_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_theme_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_initiative_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE hierarchy_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- For MVP Phase 1: Allow all authenticated users to read/write
CREATE POLICY "Allow authenticated users full access" ON portfolios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON program_increments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON iterations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON strategic_themes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON initiatives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON business_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON epics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON features FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON stories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON risks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON capacity_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON release_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON releases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON release_feature_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON release_story_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON objective_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON objectives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON key_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON objective_theme_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON objective_initiative_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON hierarchy_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON custom_field_defs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON custom_field_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON board_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON permission_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON permission_grants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON integration_connectors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SECTION 12: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_programs_portfolio ON programs(portfolio_id);
CREATE INDEX idx_teams_program ON teams(program_id);
CREATE INDEX idx_pis_portfolio ON program_increments(portfolio_id);
CREATE INDEX idx_iterations_pi ON iterations(pi_id);
CREATE INDEX idx_initiatives_theme ON initiatives(theme_id);
CREATE INDEX idx_brs_theme ON business_requests(theme_id);
CREATE INDEX idx_brs_initiative ON business_requests(initiative_id);
CREATE INDEX idx_epics_br ON epics(br_id);
CREATE INDEX idx_epics_theme ON epics(theme_id);
CREATE INDEX idx_features_epic ON features(epic_id);
CREATE INDEX idx_features_program ON features(program_id);
CREATE INDEX idx_features_pi ON features(pi_id);
CREATE INDEX idx_features_iteration ON features(iteration_id);
CREATE INDEX idx_stories_feature ON stories(feature_id);
CREATE INDEX idx_stories_team ON stories(team_id);
CREATE INDEX idx_stories_sprint ON stories(sprint_id);
CREATE INDEX idx_subtasks_story ON subtasks(story_id);
CREATE INDEX idx_dependencies_from ON dependencies(from_feature_id);
CREATE INDEX idx_dependencies_to ON dependencies(to_feature_id);
CREATE INDEX idx_risks_program ON risks(program_id);
CREATE INDEX idx_risks_pi ON risks(pi_id);
CREATE INDEX idx_capacity_team ON capacity_allocations(team_id);
CREATE INDEX idx_capacity_iteration ON capacity_allocations(iteration_id);
CREATE INDEX idx_objectives_level ON objectives(objective_level_id);
CREATE INDEX idx_key_results_objective ON key_results(objective_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);

-- ============================================================================
-- SECTION 13: SEED DATA - HIERARCHY CONFIGURATION
-- ============================================================================

INSERT INTO hierarchy_configs (level_key, enabled, display_name, sort_order) VALUES
  ('theme', true, 'Strategic Theme', 1),
  ('initiative', true, 'Initiative', 2),
  ('br', true, 'Business Request', 3),
  ('epic', true, 'Epic', 4),
  ('feature', true, 'Feature', 5),
  ('story', true, 'Story', 6),
  ('subtask', true, 'Sub-task', 7);

-- ============================================================================
-- SECTION 14: SEED DATA - ORGANIZATION & PLANNING
-- ============================================================================

-- Insert Portfolio
INSERT INTO portfolios (id, name, owner_id, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TurnQy Portfolio Alpha', NULL, 'active');

-- Insert Programs
INSERT INTO programs (id, portfolio_id, name, rte_id, status) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Investor Journey Program', NULL, 'active'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'RHQ Digital Program', NULL, 'active');

-- Insert Teams
INSERT INTO teams (id, program_id, name, velocity_baseline) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'IJ Team A', 30),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'IJ Team B', 28),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'RHQ Team A', 32),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'RHQ Team B', 30);

-- Insert PIs
INSERT INTO program_increments (id, portfolio_id, name, start_date, end_date, state) VALUES
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'PI-2025-Q3', '2025-07-01', '2025-09-30', 'active'),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'PI-2025-Q4', '2025-10-01', '2025-12-31', 'planned');

-- Insert Iterations for PI-2025-Q3
INSERT INTO iterations (id, pi_id, team_id, name, start_date, end_date) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', NULL, 'Iteration 1', '2025-07-01', '2025-07-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', NULL, 'Iteration 2', '2025-08-01', '2025-08-31'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', NULL, 'Iteration 3', '2025-09-01', '2025-09-30');

-- Insert Iterations for PI-2025-Q4
INSERT INTO iterations (id, pi_id, team_id, name, start_date, end_date) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', NULL, 'Iteration 1', '2025-10-01', '2025-10-31'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '99999999-9999-9999-9999-999999999999', NULL, 'Iteration 2', '2025-11-01', '2025-11-30'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '99999999-9999-9999-9999-999999999999', NULL, 'Iteration 3', '2025-12-01', '2025-12-31');

-- ============================================================================
-- SECTION 15: SEED DATA - WORK HIERARCHY
-- ============================================================================

-- Insert Strategic Theme
INSERT INTO strategic_themes (id, name, description, status, color_tag) VALUES
  ('10101010-1010-1010-1010-101010101010', 'Industrial Digitization 2026', 'Transform industrial operations through digital enablement', 'active', '#0052CC');

-- Insert Initiative
INSERT INTO initiatives (id, theme_id, name, description, status, wsjf_score, benefit_score) VALUES
  ('20202020-2020-2020-2020-202020202020', '10101010-1010-1010-1010-101010101010', 'Investor Journey Acceleration', 'Streamline and accelerate investor onboarding and management', 'active', 75, 85);

-- Insert Business Request
INSERT INTO business_requests (id, theme_id, initiative_id, name, description, status, estimate_swag, wsjf_score, health) VALUES
  ('30303030-3030-3030-3030-303030303030', '10101010-1010-1010-1010-101010101010', '20202020-2020-2020-2020-202020202020', 'RHQ Incentives Streamlining', 'Modernize RHQ incentives management and processing', 'in_progress', 89, 70, 'green');

-- Insert Epic
INSERT INTO epics (id, br_id, theme_id, name, description, status, estimate, health, primary_program_id) VALUES
  ('40404040-4040-4040-4040-404040404040', '30303030-3030-3030-3030-303030303030', '10101010-1010-1010-1010-101010101010', 'Standard Incentives HS12', 'Implement standardized incentive processing for HS12', 'in_progress', 55, 'green', '22222222-2222-2222-2222-222222222222');

-- Insert Features
INSERT INTO features (id, epic_id, program_id, pi_id, iteration_id, name, description, status, estimate_points, wsjf_score, progress_pct, health) VALUES
  ('50505050-5050-5050-5050-505050505050', '40404040-4040-4040-4040-404040404040', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Eligibility Rules Engine v1', 'Core eligibility rules engine for investor incentives', 'implementing', 21, 65, 45, 'green'),
  ('60606060-6060-6060-6060-606060606060', '40404040-4040-4040-4040-404040404040', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Investor 360 Data Sync v1', 'Real-time data synchronization for investor profiles', 'backlog', 13, 55, 10, 'yellow');

-- Insert Stories
INSERT INTO stories (id, feature_id, team_id, sprint_id, name, description, status, estimate_points) VALUES
  ('70707070-7070-7070-7070-707070707070', '50505050-5050-5050-5050-505050505050', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Implement base rule engine framework', 'Set up the core framework for the rules engine', 'in_progress', 8),
  ('80808080-8080-8080-8080-808080808080', '50505050-5050-5050-5050-505050505050', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Create eligibility criteria API', 'Build REST API for eligibility checks', 'todo', 5);

-- Insert Subtasks
INSERT INTO subtasks (id, story_id, name, description, status, original_estimate_hours) VALUES
  ('90909090-9090-9090-9090-909090909090', '70707070-7070-7070-7070-707070707070', 'Define rule engine interface', 'Design and document the rule engine interface', 'done', 4),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '70707070-7070-7070-7070-707070707070', 'Implement rule parser', 'Build parser for rule definitions', 'in_progress', 6),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '70707070-7070-7070-7070-707070707070', 'Add unit tests for core engine', 'Write comprehensive unit tests', 'todo', 3);

-- ============================================================================
-- SECTION 16: SEED DATA - DEPENDENCIES & RISKS
-- ============================================================================

-- Insert Dependency
INSERT INTO dependencies (id, from_feature_id, to_feature_id, type, status, risk_level, due_iteration_id) VALUES
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '50505050-5050-5050-5050-505050505050', '60606060-6060-6060-6060-606060606060', 'sequential', 'in_progress', 'med', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Insert Risks
INSERT INTO risks (id, program_id, pi_id, name, description, roam_status, probability, impact) VALUES
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'API Integration Delay', 'Third-party API integration may be delayed', 'owned', 3, 4),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'Resource Availability', 'Key team members may have competing priorities', 'mitigated', 2, 3);

-- ============================================================================
-- SECTION 17: SEED DATA - CAPACITY & RELEASES
-- ============================================================================

-- Insert Capacity Allocations for all teams in PI-2025-Q3
INSERT INTO capacity_allocations (team_id, iteration_id, capacity_points) VALUES
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 30),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 28),
  ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 32),
  ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 28),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 30),
  ('55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 26),
  ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 32),
  ('66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 34),
  ('66666666-6666-6666-6666-666666666666', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 30),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 30),
  ('77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 32),
  ('77777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 28);

-- Insert Release Vehicle and Release
INSERT INTO release_vehicles (id, program_id, name, type) VALUES
  ('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '22222222-2222-2222-2222-222222222222', 'PI-2025-Q3 Release', 'program');

INSERT INTO releases (id, release_vehicle_id, name, target_date, status, readiness_pct) VALUES
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', 'Q3 Release 1.0', '2025-09-30', 'ready', 75);

-- Link Features to Release
INSERT INTO release_feature_links (release_id, feature_id) VALUES
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '50505050-5050-5050-5050-505050505050'),
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '60606060-6060-6060-6060-606060606060');

-- Link Stories to Release
INSERT INTO release_story_links (release_id, story_id) VALUES
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '70707070-7070-7070-7070-707070707070'),
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '80808080-8080-8080-8080-808080808080');