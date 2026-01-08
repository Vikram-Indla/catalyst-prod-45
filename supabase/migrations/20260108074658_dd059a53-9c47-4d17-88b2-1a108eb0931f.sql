-- Add missing user/access tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_product_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_roles;