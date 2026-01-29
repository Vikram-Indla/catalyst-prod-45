-- ============================================
-- SEED PERMISSIONS WITH SMART DEFAULTS
-- ============================================
INSERT INTO admin_role_module_permissions (role_code, module_key, access_level)
SELECT 
  pr.code as role_code,
  anm.module_key,
  CASE 
    -- SUPER ADMIN: Full access to EVERYTHING
    WHEN pr.code = 'super_admin' THEN 'full'
    
    -- SETTINGS: Hidden for everyone except Super Admin
    WHEN anm.module_key = 'settings' THEN 'hidden'
    
    -- TOP NAV & UTILITIES: Full for everyone (except Settings)
    WHEN anm.group_name IN ('Top Nav', 'Utilities') THEN 'full'
    
    -- QA ROLES: Full access to Releases
    WHEN pr.code IN ('qa_tester', 'qa_lead', 'test_engineer') 
      AND anm.group_name = 'Releases' THEN 'full'
    
    -- PRODUCT ROLES: Full access to Product
    WHEN pr.code IN ('product_owner', 'technical_po', 'business_analyst', 'ux_designer') 
      AND anm.group_name = 'Product' THEN 'full'
    
    -- MANAGEMENT: Full access to Enterprise
    WHEN pr.code IN ('management', 'pmo', 'project_manager', 'delivery_manager', 'enterprise_architect', 'solutions_architect') 
      AND anm.group_name = 'Enterprise' THEN 'full'
    
    -- DEVELOPERS: Full access to Product + Planner
    WHEN pr.code IN ('react_developer', 'react_lead', 'backend_developer', 'backend_architect', 'dotnet_developer', 'dotnet_lead', 'mobile_developer', 'data_engineer', 'database_engineer') 
      AND anm.group_name IN ('Product', 'Planner') THEN 'full'
    
    -- DEVOPS/INFRA: Full access to Operations
    WHEN pr.code IN ('devops', 'infrastructure_engineer', 'support_engineer', 'service_engineer', 'ns_engineer') 
      AND anm.group_name = 'Operations' THEN 'full'
    
    -- EVERYONE: View access to Planner (collaboration)
    WHEN anm.group_name = 'Planner' THEN 'view'
    
    -- DEFAULT: View access (visible but request-gated)
    ELSE 'view'
  END as access_level
FROM product_roles pr
CROSS JOIN admin_nav_modules anm
WHERE pr.is_active = true
ON CONFLICT (role_code, module_key) DO UPDATE SET access_level = EXCLUDED.access_level;