-- Enable REPLICA IDENTITY FULL for real-time updates on attachments
ALTER TABLE public.attachments REPLICA IDENTITY FULL;

-- Add attachments table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;