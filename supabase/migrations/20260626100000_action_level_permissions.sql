-- CAT-AI-ACCESS-MGMT-20260626-003 / Slice 1
-- Replace module-level permission groups with action-level groups (Project + Product modules).
-- All existing roles get Deny on all 32 actions by default.
-- Existing user_permission_overrides for module='Product' are cleared (they referenced old module names).

-- 1. Clear stale overrides (old permission_group values are now meaningless)
DELETE FROM user_permission_overrides WHERE module = 'Product';

-- 2. Clear old module-level permission rows
DELETE FROM product_role_permissions;

-- 3. Insert new action-level rows: every role × every action = Deny by default
INSERT INTO product_role_permissions (role_id, permission_group, permission_level)
SELECT r.id, g.grp, 'Deny'
FROM product_roles r
CROSS JOIN (VALUES
  -- Project module
  ('Project: Create'),
  ('Project: Delete'),
  ('Project: Archive'),
  ('Project: Rename'),
  ('Project: Manage Members'),
  ('Project: Change Lead'),
  ('Project: Edit Settings'),
  ('Project: Export Data'),
  ('Project: View All Projects'),
  ('Project: Change Icon'),
  -- Product module — Stories
  ('Product: Create Story'),
  ('Product: Delete Story'),
  ('Product: Edit Story'),
  ('Product: Rename Story'),
  ('Product: Assign Story'),
  ('Product: Change Story Status'),
  ('Product: Change Story Priority'),
  ('Product: Move Story to Sprint'),
  ('Product: Clone Story'),
  -- Product module — Epics & Sprints
  ('Product: Create Epic'),
  ('Product: Delete Epic'),
  ('Product: Edit Epic'),
  ('Product: Create Sprint'),
  ('Product: Start Sprint'),
  ('Product: Close Sprint'),
  ('Product: Delete Sprint'),
  -- Product module — Board & General
  ('Product: View Backlog'),
  ('Product: Manage Board'),
  ('Product: Add Comment'),
  ('Product: Delete Comment'),
  ('Product: Link Issues'),
  ('Product: Export Stories')
) AS g(grp)
ON CONFLICT DO NOTHING;

-- 4. Grant all Allow to admin role (role where code = 'admin', if it exists)
UPDATE product_role_permissions
SET permission_level = 'Allow'
WHERE role_id IN (
  SELECT id FROM product_roles WHERE code IN ('admin', 'super_admin', 'administrator')
);
