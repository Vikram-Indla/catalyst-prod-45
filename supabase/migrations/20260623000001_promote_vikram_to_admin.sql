-- Grant Vikram admin role to access deploy-control and other admin pages

-- Find Vikram's user ID by email and grant admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'vikramataol@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Log the role assignment in audit history
INSERT INTO public.user_role_history (user_id, role, action, changed_by, notes)
SELECT id, 'admin'::app_role, 'assigned', id, 'Initial admin access for owner'
FROM auth.users
WHERE email = 'vikramataol@gmail.com'
ON CONFLICT DO NOTHING;
