-- Add Enterprise Architect and Project Manager roles to product_roles
INSERT INTO public.product_roles (code, name, description, scope, is_active)
VALUES 
  ('enterprise_architect', 'Enterprise Architect', 'Reviews enterprise architecture and provides EA assessments', 'global', true),
  ('project_manager', 'Project Manager', 'Manages project budgets, risks, and milestones', 'product', true)
ON CONFLICT (code) DO NOTHING;