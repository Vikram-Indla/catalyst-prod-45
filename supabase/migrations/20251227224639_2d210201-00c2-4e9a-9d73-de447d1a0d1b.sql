-- Enable realtime for objectives table
ALTER TABLE public.objectives REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.objectives;