-- =====================================================
-- MODULE MATRIX SCHEMA - Phase 1
-- Navigation registry + Role-Module permissions matrix
-- =====================================================

-- 1. Navigation Modules Registry
CREATE TABLE IF NOT EXISTS public.admin_nav_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  route_path TEXT,
  parent_key TEXT REFERENCES public.admin_nav_modules(key) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Role-Module Permissions Matrix
CREATE TABLE IF NOT EXISTS public.admin_role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT NOT NULL,
  module_key TEXT NOT NULL REFERENCES public.admin_nav_modules(key) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'none' CHECK (access_level IN ('none', 'view', 'full')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_code, module_key)
);

-- 3. Permission Audit Log
CREATE TABLE IF NOT EXISTS public.admin_permission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by UUID REFERENCES auth.users(id),
  role_code TEXT NOT NULL,
  module_key TEXT NOT NULL,
  old_access_level TEXT,
  new_access_level TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_nav_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permission_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_nav_modules (read by all authenticated, write by admins)
CREATE POLICY "Authenticated users can view nav modules"
  ON public.admin_nav_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage nav modules"
  ON public.admin_nav_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for admin_role_module_permissions
CREATE POLICY "Authenticated users can view permissions"
  ON public.admin_role_module_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage permissions"
  ON public.admin_role_module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- RLS Policies for audit log
CREATE POLICY "Admins can view audit log"
  ON public.admin_permission_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert audit entries"
  ON public.admin_permission_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- RPC Functions
-- =====================================================

-- Get full module matrix for admin UI
CREATE OR REPLACE FUNCTION public.get_module_matrix()
RETURNS TABLE (
  module_key TEXT,
  module_label TEXT,
  module_description TEXT,
  parent_key TEXT,
  sort_order INTEGER,
  role_code TEXT,
  role_name TEXT,
  access_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.key as module_key,
    m.label as module_label,
    m.description as module_description,
    m.parent_key,
    m.sort_order,
    r.code as role_code,
    r.name as role_name,
    COALESCE(p.access_level, 'none') as access_level
  FROM admin_nav_modules m
  CROSS JOIN product_roles r
  LEFT JOIN admin_role_module_permissions p 
    ON p.module_key = m.key AND p.role_code = r.code
  WHERE m.is_active = true
  ORDER BY m.sort_order, m.key, r.name;
END;
$$;

-- Update module permission with audit trail
CREATE OR REPLACE FUNCTION public.update_module_permission(
  p_role_code TEXT,
  p_module_key TEXT,
  p_access_level TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level TEXT;
BEGIN
  -- Get old value for audit
  SELECT access_level INTO v_old_level
  FROM admin_role_module_permissions
  WHERE role_code = p_role_code AND module_key = p_module_key;

  -- Upsert permission
  INSERT INTO admin_role_module_permissions (role_code, module_key, access_level, updated_at)
  VALUES (p_role_code, p_module_key, p_access_level, now())
  ON CONFLICT (role_code, module_key) 
  DO UPDATE SET access_level = p_access_level, updated_at = now();

  -- Audit log
  INSERT INTO admin_permission_audit (changed_by, role_code, module_key, old_access_level, new_access_level)
  VALUES (auth.uid(), p_role_code, p_module_key, v_old_level, p_access_level);

  RETURN true;
END;
$$;

-- Check if user has access to a module
CREATE OR REPLACE FUNCTION public.check_module_access(
  p_user_id UUID,
  p_module_key TEXT,
  p_required_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_access_level TEXT;
BEGIN
  -- Get user's profile role (super_admin bypasses all)
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Check product roles for this user
  SELECT MAX(
    CASE p.access_level
      WHEN 'full' THEN 3
      WHEN 'view' THEN 2
      WHEN 'none' THEN 1
      ELSE 0
    END
  ) INTO v_access_level
  FROM user_product_roles upr
  JOIN admin_role_module_permissions p ON p.role_code = upr.role_code
  WHERE upr.user_id = p_user_id AND p.module_key = p_module_key;

  -- Compare with required level
  RETURN CASE 
    WHEN p_required_level = 'full' THEN v_access_level >= 3
    WHEN p_required_level = 'view' THEN v_access_level >= 2
    ELSE v_access_level >= 1
  END;
END;
$$;

-- =====================================================
-- Seed Data: Catalyst Navigation Modules
-- =====================================================

INSERT INTO public.admin_nav_modules (key, label, description, icon_name, route_path, parent_key, sort_order) VALUES
-- Top-level modules
('capacity', 'Capacity Planner', 'Resource allocation and capacity management', 'Users', '/capacity', NULL, 10),
('budget', 'Budget Planner', 'Financial planning and budget tracking', 'DollarSign', '/budget', NULL, 20),
('backlog', 'Industry Backlog', 'Work item management and prioritization', 'ListTodo', '/backlog', NULL, 30),
('planner', 'Work Manager', 'Task and workstream management', 'Kanban', '/planner', NULL, 40),
('releases', 'Release Dashboard', 'Release planning and tracking', 'Rocket', '/releases', NULL, 50),
('incidents', 'Incident Room', 'Incident management and resolution', 'AlertTriangle', '/incidents', NULL, 60),
('dependencies', 'Dependency Board', 'Cross-team dependency tracking', 'GitBranch', '/dependencies', NULL, 70),
('defects', 'Defects', 'Defect tracking and management', 'Bug', '/defects', NULL, 80),
('testing', 'Test Management', 'Test case and execution management', 'TestTube', '/testing', NULL, 90),
('reports', 'Reports & Analytics', 'Dashboards and reporting', 'BarChart', '/reports', NULL, 100),
('admin', 'Settings & Admin', 'System configuration and administration', 'Settings', '/admin', NULL, 999)
ON CONFLICT (key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_module_perms_role ON public.admin_role_module_permissions(role_code);
CREATE INDEX IF NOT EXISTS idx_role_module_perms_module ON public.admin_role_module_permissions(module_key);
CREATE INDEX IF NOT EXISTS idx_nav_modules_parent ON public.admin_nav_modules(parent_key);
CREATE INDEX IF NOT EXISTS idx_permission_audit_changed_at ON public.admin_permission_audit(changed_at DESC);