-- Fix is_user_admin function to check both user_roles table AND product_roles for super_admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check system-level admin role in user_roles
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = is_user_admin.user_id
    AND user_roles.role = 'admin'::app_role
  )
  OR EXISTS (
    -- Also check product-level Super Admin role in user_product_roles
    SELECT 1 
    FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = is_user_admin.user_id
    AND pr.code = 'super_admin'
  );
$$;