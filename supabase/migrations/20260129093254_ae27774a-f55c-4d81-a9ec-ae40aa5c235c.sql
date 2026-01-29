-- First drop any conflicting tables  
DROP TABLE IF EXISTS admin_permission_audit CASCADE;
DROP TABLE IF EXISTS admin_role_module_permissions CASCADE;
DROP TABLE IF EXISTS admin_nav_modules CASCADE;

-- ============================================
-- TABLE 1: admin_nav_modules (49 modules)
-- ============================================
CREATE TABLE admin_nav_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_name VARCHAR(100) NOT NULL,
  nav_type VARCHAR(50) NOT NULL DEFAULT 'sidebar',
  parent_module VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_nav_modules_group ON admin_nav_modules(group_name);
CREATE INDEX idx_nav_modules_sort ON admin_nav_modules(sort_order);

-- Enable RLS
ALTER TABLE admin_nav_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_nav_modules_select" ON admin_nav_modules FOR SELECT TO authenticated USING (true);

-- ============================================
-- TABLE 2: admin_role_module_permissions
-- ============================================
CREATE TABLE admin_role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(100) NOT NULL,
  module_key VARCHAR(100) NOT NULL REFERENCES admin_nav_modules(module_key) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL DEFAULT 'hidden' CHECK (access_level IN ('full', 'view', 'hidden')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(role_code, module_key)
);

CREATE INDEX idx_permissions_role ON admin_role_module_permissions(role_code);
CREATE INDEX idx_permissions_module ON admin_role_module_permissions(module_key);

ALTER TABLE admin_role_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_permissions_select" ON admin_role_module_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_permissions_insert" ON admin_role_module_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_permissions_update" ON admin_role_module_permissions FOR UPDATE TO authenticated USING (true);

-- ============================================
-- TABLE 3: admin_permission_audit
-- ============================================
CREATE TABLE admin_permission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  admin_user_id UUID REFERENCES auth.users(id),
  role_code VARCHAR(100) NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  old_access_level VARCHAR(20),
  new_access_level VARCHAR(20) NOT NULL,
  reason TEXT
);

ALTER TABLE admin_permission_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_select" ON admin_permission_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_audit_insert" ON admin_permission_audit FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- SEED 49 MODULES
-- ============================================
INSERT INTO admin_nav_modules (module_key, name, description, group_name, nav_type, parent_module, sort_order) VALUES
-- TOP NAV (6 modules)
('home', 'Home', 'Home dashboard', 'Top Nav', 'top_nav', NULL, 100),
('enterprise', 'Enterprise', 'Enterprise portfolio', 'Top Nav', 'top_nav', NULL, 101),
('product', 'Product', 'Product management', 'Top Nav', 'top_nav', NULL, 102),
('releases', 'Releases', 'Release management', 'Top Nav', 'top_nav', NULL, 103),
('operations', 'Operations', 'Operations center', 'Top Nav', 'top_nav', NULL, 104),
('planner', 'Planner', 'Task planner', 'Top Nav', 'top_nav', NULL, 105),

-- UTILITIES (4 modules)
('create', 'Create', 'Quick create', 'Utilities', 'utility', NULL, 200),
('notifications', 'Notifications', 'Notification center', 'Utilities', 'utility', NULL, 201),
('settings', 'Settings', 'Global settings', 'Utilities', 'utility', NULL, 202),
('global_search', 'Global Search', 'Search platform', 'Utilities', 'utility', NULL, 203),

-- ENTERPRISE (8 modules)
('strategy_room', 'Strategy Room', 'Strategic planning', 'Enterprise', 'sidebar', 'enterprise', 300),
('strategic_backlog', 'Strategic Backlog', 'Enterprise backlog', 'Enterprise', 'sidebar', 'enterprise', 301),
('objective_tree', 'Objective Tree', 'OKR hierarchy', 'Enterprise', 'sidebar', 'enterprise', 302),
('enterprise_roadmap', 'Enterprise Roadmap', 'Portfolio roadmap', 'Enterprise', 'sidebar', 'enterprise', 303),
('risks', 'Risks', 'Risk register', 'Enterprise', 'sidebar', 'enterprise', 304),
('capacity_planner', 'Capacity Planner', 'Resource planning', 'Enterprise', 'sidebar', 'enterprise', 305),
('budget_planner', 'Budget Planner', 'Budget allocation', 'Enterprise', 'sidebar', 'enterprise', 306),
('enterprise_reports', 'Reports', 'Enterprise reports', 'Enterprise', 'sidebar', 'enterprise', 307),

-- PRODUCT (5 modules)
('product_backlog', 'Product Backlog', 'Product backlog', 'Product', 'sidebar', 'product', 400),
('product_kanban', 'Product Kanban', 'Kanban board', 'Product', 'sidebar', 'product', 401),
('product_roadmap', 'Product Roadmap', 'Product roadmap', 'Product', 'sidebar', 'product', 402),
('ideas', 'Ideas', 'Idea management', 'Product', 'sidebar', 'product', 403),
('requirement_assist', 'Requirement Assist™', 'AI requirements', 'Product', 'sidebar', 'product', 404),

-- RELEASES (15 modules)
('command_center', 'Command Center', 'Release command', 'Releases', 'sidebar', 'releases', 500),
('release_dashboard', 'Release Dashboard', 'Release overview', 'Releases', 'sidebar', 'releases', 501),
('my_test_scope', 'My Test Scope', 'Personal tests', 'Releases', 'sidebar', 'releases', 502),
('all_releases', 'All Releases', 'Release list', 'Releases', 'sidebar', 'releases', 503),
('calendar_view', 'Calendar View', 'Release calendar', 'Releases', 'sidebar', 'releases', 504),
('release_compare', 'Release Compare', 'Compare releases', 'Releases', 'sidebar', 'releases', 505),
('test_plans', 'Test Plans', 'Test planning', 'Releases', 'sidebar', 'releases', 506),
('test_cases', 'Test Cases', 'Test case library', 'Releases', 'sidebar', 'releases', 507),
('test_cycles', 'Test Cycles', 'Test cycles', 'Releases', 'sidebar', 'releases', 508),
('test_execution', 'Test Execution', 'Execute tests', 'Releases', 'sidebar', 'releases', 509),
('defects', 'Defects', 'Defect tracking', 'Releases', 'sidebar', 'releases', 510),
('ask_ai', 'Ask AI', 'AI assistant', 'Releases', 'sidebar', 'releases', 511),
('coverage_reports', 'Coverage Reports', 'Test coverage', 'Releases', 'sidebar', 'releases', 512),
('quality_gates', 'Quality Gates', 'Quality criteria', 'Releases', 'sidebar', 'releases', 513),
('rtm', 'RTM', 'Traceability matrix', 'Releases', 'sidebar', 'releases', 514),

-- OPERATIONS (3 modules)
('incident_list', 'Incident List', 'Active incidents', 'Operations', 'sidebar', 'operations', 600),
('incident_reports', 'Incident Reports', 'Incident analytics', 'Operations', 'sidebar', 'operations', 601),
('committee_queue', 'Committee Queue', 'Change advisory', 'Operations', 'sidebar', 'operations', 602),

-- PLANNER (8 modules)
('planner_dashboard', 'Dashboard', 'Planner overview', 'Planner', 'sidebar', 'planner', 700),
('workstreams', 'Workstreams', 'Workstream mgmt', 'Planner', 'sidebar', 'planner', 701),
('my_tasks', 'My Tasks', 'Personal tasks', 'Planner', 'sidebar', 'planner', 702),
('boards', 'Boards', 'Kanban boards', 'Planner', 'sidebar', 'planner', 703),
('task_list', 'Task List', 'All tasks', 'Planner', 'sidebar', 'planner', 704),
('timeline', 'Timeline', 'Gantt view', 'Planner', 'sidebar', 'planner', 705),
('calendar', 'Calendar', 'Task calendar', 'Planner', 'sidebar', 'planner', 706),
('planner_settings', 'Settings', 'Planner settings', 'Planner', 'sidebar', 'planner', 707);