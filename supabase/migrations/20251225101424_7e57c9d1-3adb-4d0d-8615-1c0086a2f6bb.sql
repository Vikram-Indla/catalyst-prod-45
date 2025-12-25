-- Enable realtime for epics table
ALTER PUBLICATION supabase_realtime ADD TABLE public.epics;

-- Also set REPLICA IDENTITY FULL for complete row data during updates
ALTER TABLE public.epics REPLICA IDENTITY FULL;