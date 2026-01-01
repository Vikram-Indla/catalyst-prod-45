-- Set REPLICA IDENTITY FULL for assignments table to enable realtime DELETE events
ALTER TABLE public.assignments REPLICA IDENTITY FULL;