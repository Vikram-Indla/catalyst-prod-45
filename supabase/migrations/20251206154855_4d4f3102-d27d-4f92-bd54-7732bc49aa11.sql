-- Create product_roles table for Product module roles
CREATE TABLE public.product_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  scope TEXT DEFAULT 'Product',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_role_permissions table for the permissions matrix
CREATE TABLE public.product_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.product_roles(id) ON DELETE CASCADE NOT NULL,
  permission_group TEXT NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('Full', 'View only', 'Own only', 'None')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_group)
);

-- Create user_product_roles table to assign users to product roles
CREATE TABLE public.user_product_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.product_roles(id) ON DELETE CASCADE NOT NULL,
  business_lines TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user_permission_overrides table for custom user overrides
CREATE TABLE public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_group TEXT NOT NULL,
  override_value TEXT NOT NULL CHECK (override_value IN ('Inherited', 'Allow', 'Deny')),
  module TEXT DEFAULT 'Product',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_group, module)
);

-- Enable RLS
ALTER TABLE public.product_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_product_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_roles (read by all authenticated, write by admins)
CREATE POLICY "product_roles_read" ON public.product_roles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_roles_admin_write" ON public.product_roles 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for product_role_permissions
CREATE POLICY "product_role_permissions_read" ON public.product_role_permissions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_role_permissions_admin_write" ON public.product_role_permissions 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_product_roles
CREATE POLICY "user_product_roles_read" ON public.user_product_roles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_product_roles_admin_write" ON public.user_product_roles 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_permission_overrides
CREATE POLICY "user_permission_overrides_read" ON public.user_permission_overrides 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_permission_overrides_admin_write" ON public.user_permission_overrides 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default product roles
INSERT INTO public.product_roles (name, code, description, is_active, scope) VALUES
  ('Super Admin', 'super_admin', 'Full system access with all permissions', true, 'Product'),
  ('Product Admin', 'product_admin', 'Manage product configuration and settings', true, 'Product'),
  ('General Manager', 'general_manager', 'Oversee business lines and strategic decisions', true, 'Product'),
  ('Product Manager', 'product_manager', 'Manage demands and coordinate with stakeholders', true, 'Product'),
  ('Product Owner', 'product_owner', 'Own backlog and define requirements', true, 'Product'),
  ('Requester', 'requester', 'Submit and track business requests', true, 'Product');

-- Insert default permissions matrix
WITH roles AS (
  SELECT id, code FROM public.product_roles
)
INSERT INTO public.product_role_permissions (role_id, permission_group, permission_level)
SELECT 
  r.id,
  pg.permission_group,
  CASE 
    -- Super Admin: Full access to everything
    WHEN r.code = 'super_admin' THEN 'Full'
    -- Product Admin: Full access to everything
    WHEN r.code = 'product_admin' THEN 'Full'
    -- General Manager
    WHEN r.code = 'general_manager' AND pg.permission_group = 'View Demands' THEN 'Full'
    WHEN r.code = 'general_manager' AND pg.permission_group = 'CreateEdit Demands' THEN 'View only'
    WHEN r.code = 'general_manager' AND pg.permission_group = 'Workflow Actions' THEN 'Full'
    WHEN r.code = 'general_manager' AND pg.permission_group IN ('Budget Tab', 'Risks Tab', 'Milestones Tab', 'Links Tab') THEN 'View only'
    WHEN r.code = 'general_manager' AND pg.permission_group = 'Export' THEN 'Full'
    WHEN r.code = 'general_manager' AND pg.permission_group IN ('Import', 'Product Settings') THEN 'None'
    -- Product Manager
    WHEN r.code = 'product_manager' AND pg.permission_group IN ('View Demands', 'CreateEdit Demands', 'Workflow Actions', 'Risks Tab', 'Links Tab') THEN 'Full'
    WHEN r.code = 'product_manager' AND pg.permission_group IN ('Budget Tab', 'Milestones Tab') THEN 'View only'
    WHEN r.code = 'product_manager' AND pg.permission_group IN ('Export', 'Import', 'Product Settings') THEN 'None'
    -- Product Owner
    WHEN r.code = 'product_owner' AND pg.permission_group IN ('View Demands', 'CreateEdit Demands') THEN 'Full'
    WHEN r.code = 'product_owner' AND pg.permission_group = 'Workflow Actions' THEN 'Own only'
    WHEN r.code = 'product_owner' AND pg.permission_group = 'Budget Tab' THEN 'None'
    WHEN r.code = 'product_owner' AND pg.permission_group IN ('Risks Tab', 'Milestones Tab', 'Links Tab') THEN 'Full'
    WHEN r.code = 'product_owner' AND pg.permission_group IN ('Export', 'Import', 'Product Settings') THEN 'None'
    -- Requester
    WHEN r.code = 'requester' AND pg.permission_group IN ('View Demands', 'CreateEdit Demands', 'Workflow Actions', 'Links Tab') THEN 'Own only'
    WHEN r.code = 'requester' THEN 'None'
    ELSE 'None'
  END as permission_level
FROM roles r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'View Demands', 'CreateEdit Demands', 'Workflow Actions', 
    'Budget Tab', 'Risks Tab', 'Milestones Tab', 'Links Tab',
    'Export', 'Import', 'Product Settings'
  ]) as permission_group
) pg;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_product_roles_updated_at
  BEFORE UPDATE ON public.product_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_role_permissions_updated_at
  BEFORE UPDATE ON public.product_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_permission_overrides_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();