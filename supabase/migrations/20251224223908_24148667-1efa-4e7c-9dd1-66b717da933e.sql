-- Enable realtime for create_menu_visibility table
ALTER TABLE public.create_menu_visibility REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.create_menu_visibility;