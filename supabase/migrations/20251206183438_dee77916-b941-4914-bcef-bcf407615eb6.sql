-- Drop the incorrect unique constraint on user_id that prevents multiple roles per user
ALTER TABLE public.user_product_roles DROP CONSTRAINT IF EXISTS user_product_roles_user_id_key;

-- Add a proper unique constraint on (user_id, role_id) combination instead
-- This prevents duplicate role assignments while allowing multiple roles per user
ALTER TABLE public.user_product_roles ADD CONSTRAINT user_product_roles_user_role_unique UNIQUE (user_id, role_id);