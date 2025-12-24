-- Add developer and qa_tester roles to product_roles table
INSERT INTO product_roles (code, name, description) 
VALUES 
  ('developer', 'Developer', 'Develops features and fixes bugs'),
  ('qa_tester', 'QA Tester', 'Tests features and reports defects')
ON CONFLICT (code) DO NOTHING;

-- Create table to store create menu visibility settings per role
CREATE TABLE IF NOT EXISTS public.create_menu_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT NOT NULL,
  work_item_type TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_code, work_item_type)
);

-- Enable RLS
ALTER TABLE public.create_menu_visibility ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can read create_menu_visibility"
ON public.create_menu_visibility
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage create_menu_visibility"
ON public.create_menu_visibility
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_product_roles upr
    JOIN product_roles pr ON upr.role_id = pr.id
    WHERE upr.user_id = auth.uid() 
    AND pr.code IN ('super_admin', 'product_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_product_roles upr
    JOIN product_roles pr ON upr.role_id = pr.id
    WHERE upr.user_id = auth.uid() 
    AND pr.code IN ('super_admin', 'product_admin')
  )
);

-- Insert default visibility settings based on requirements
-- Super Admin can see all
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('super_admin', 'theme', true),
('super_admin', 'objective', true),
('super_admin', 'business-request', true),
('super_admin', 'epic', true),
('super_admin', 'feature', true),
('super_admin', 'story', true),
('super_admin', 'defect', true),
('super_admin', 'incident', true),
('super_admin', 'dependency', true),
('super_admin', 'risk', true);

-- Product Owner: Business Requests, Epics, Features
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('product_owner', 'theme', false),
('product_owner', 'objective', false),
('product_owner', 'business-request', true),
('product_owner', 'epic', true),
('product_owner', 'feature', true),
('product_owner', 'story', false),
('product_owner', 'defect', false),
('product_owner', 'incident', false),
('product_owner', 'dependency', false),
('product_owner', 'risk', false);

-- Developer: Stories only
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('developer', 'theme', false),
('developer', 'objective', false),
('developer', 'business-request', false),
('developer', 'epic', false),
('developer', 'feature', false),
('developer', 'story', true),
('developer', 'defect', false),
('developer', 'incident', false),
('developer', 'dependency', false),
('developer', 'risk', false);

-- QA Tester: Stories only  
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('qa_tester', 'theme', false),
('qa_tester', 'objective', false),
('qa_tester', 'business-request', false),
('qa_tester', 'epic', false),
('qa_tester', 'feature', false),
('qa_tester', 'story', true),
('qa_tester', 'defect', false),
('qa_tester', 'incident', false),
('qa_tester', 'dependency', false),
('qa_tester', 'risk', false);

-- Product Manager: Themes, Objectives, Epics, Features, Incidents, Risks, Dependencies
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('product_manager', 'theme', true),
('product_manager', 'objective', true),
('product_manager', 'business-request', false),
('product_manager', 'epic', true),
('product_manager', 'feature', true),
('product_manager', 'story', false),
('product_manager', 'defect', false),
('product_manager', 'incident', true),
('product_manager', 'dependency', true),
('product_manager', 'risk', true);

-- Product Admin: Same as Super Admin (all visible)
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('product_admin', 'theme', true),
('product_admin', 'objective', true),
('product_admin', 'business-request', true),
('product_admin', 'epic', true),
('product_admin', 'feature', true),
('product_admin', 'story', true),
('product_admin', 'defect', true),
('product_admin', 'incident', true),
('product_admin', 'dependency', true),
('product_admin', 'risk', true);

-- General Manager: All visible
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('general_manager', 'theme', true),
('general_manager', 'objective', true),
('general_manager', 'business-request', true),
('general_manager', 'epic', true),
('general_manager', 'feature', true),
('general_manager', 'story', true),
('general_manager', 'defect', true),
('general_manager', 'incident', true),
('general_manager', 'dependency', true),
('general_manager', 'risk', true);

-- Enterprise Architect
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('enterprise_architect', 'theme', true),
('enterprise_architect', 'objective', true),
('enterprise_architect', 'business-request', true),
('enterprise_architect', 'epic', true),
('enterprise_architect', 'feature', true),
('enterprise_architect', 'story', false),
('enterprise_architect', 'defect', false),
('enterprise_architect', 'incident', false),
('enterprise_architect', 'dependency', true),
('enterprise_architect', 'risk', true);

-- Project Manager
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('project_manager', 'theme', false),
('project_manager', 'objective', false),
('project_manager', 'business-request', true),
('project_manager', 'epic', true),
('project_manager', 'feature', true),
('project_manager', 'story', true),
('project_manager', 'defect', true),
('project_manager', 'incident', true),
('project_manager', 'dependency', true),
('project_manager', 'risk', true);

-- Requester: Business Request only
INSERT INTO public.create_menu_visibility (role_code, work_item_type, is_visible) VALUES
('requester', 'theme', false),
('requester', 'objective', false),
('requester', 'business-request', true),
('requester', 'epic', false),
('requester', 'feature', false),
('requester', 'story', false),
('requester', 'defect', false),
('requester', 'incident', false),
('requester', 'dependency', false),
('requester', 'risk', false);