-- Delete from create_menu_visibility first (references role_code)
DELETE FROM public.create_menu_visibility 
WHERE role_code IN ('requester', 'product_admin', 'general_manager');

-- Delete from user_product_roles (references role_id)
DELETE FROM public.user_product_roles 
WHERE role_id IN (
  SELECT id FROM public.product_roles 
  WHERE code IN ('requester', 'product_admin', 'general_manager')
);

-- Delete from product_role_permissions if exists (references role_id)
DELETE FROM public.product_role_permissions 
WHERE role_id IN (
  SELECT id FROM public.product_roles 
  WHERE code IN ('requester', 'product_admin', 'general_manager')
);

-- Delete from permission_grants if exists (references role_id)
DELETE FROM public.permission_grants 
WHERE role_id IN (
  SELECT id FROM public.product_roles 
  WHERE code IN ('requester', 'product_admin', 'general_manager')
);

-- Finally delete the roles themselves
DELETE FROM public.product_roles 
WHERE code IN ('requester', 'product_admin', 'general_manager');