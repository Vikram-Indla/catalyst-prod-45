-- Module access control: harden admin_role_module_permissions RLS + seed system roles.
-- Context: prior policies were INSERT WITH CHECK(true) / UPDATE USING(true) with no DELETE,
-- letting any authenticated user write the 1274-row role->module permission matrix.
-- This table is the runtime source of truth read by useUserModulePermissions at login.

-- A. Replace permissive policies with admin-gated writes + add DELETE.
DROP POLICY IF EXISTS admin_permissions_insert ON admin_role_module_permissions;
DROP POLICY IF EXISTS admin_permissions_update ON admin_role_module_permissions;
DROP POLICY IF EXISTS admin_permissions_select ON admin_role_module_permissions;

CREATE POLICY arm_select_authenticated ON admin_role_module_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY arm_insert_admin ON admin_role_module_permissions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY arm_update_admin ON admin_role_module_permissions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY arm_delete_admin ON admin_role_module_permissions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- B. Seed the 3 non-bypass system roles x all modules at 'view' (safe, non-breaking baseline).
-- admin (system) and super_admin (product) bypass the matrix in the hook, so are not seeded.
INSERT INTO admin_role_module_permissions (role_code, module_key, access_level)
SELECT sr.code, m.module_key, 'view'
FROM (VALUES ('program_manager'), ('team_lead'), ('user')) sr(code)
CROSS JOIN admin_nav_modules m
ON CONFLICT (role_code, module_key) DO NOTHING;
