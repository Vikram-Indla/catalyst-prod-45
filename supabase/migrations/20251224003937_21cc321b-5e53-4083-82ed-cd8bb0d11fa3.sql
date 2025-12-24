-- Enable realtime for business_requests table
ALTER TABLE public.business_requests REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_requests;