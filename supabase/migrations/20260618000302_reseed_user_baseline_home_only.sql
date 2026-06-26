-- The 'user' system role is every logged-in user's baseline. Seeding it view-all
-- defeated role-based hiding (the runtime merges all of a user's roles, highest access wins).
-- Restrict 'user' to Home only; product roles and managers grant access upward.
-- program_manager / team_lead remain view across all modules (managers see everything).
UPDATE admin_role_module_permissions SET access_level = 'hidden', updated_at = now()
WHERE role_code = 'user';
UPDATE admin_role_module_permissions SET access_level = 'view', updated_at = now()
WHERE role_code = 'user' AND module_key = 'home';
