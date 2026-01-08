-- Fix is_user_admin function to check user_roles table (the correct source of admin roles)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = is_user_admin.user_id
    AND user_roles.role = 'admin'::app_role
  );
$$;