-- Create presence tracking table for persistence
CREATE TABLE public.work_item_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_type TEXT NOT NULL,
  work_item_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'viewing', -- 'viewing' or 'editing'
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for user per work item
CREATE UNIQUE INDEX idx_work_item_presence_unique ON public.work_item_presence(work_item_type, work_item_id, user_id);

-- Index for quick lookups
CREATE INDEX idx_work_item_presence_item ON public.work_item_presence(work_item_type, work_item_id);

-- Enable RLS
ALTER TABLE public.work_item_presence ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view presence
CREATE POLICY "Users can view all presence" ON public.work_item_presence
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow users to manage their own presence
CREATE POLICY "Users can manage own presence" ON public.work_item_presence
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_item_presence;

-- Function to clean stale presence (older than 2 minutes)
CREATE OR REPLACE FUNCTION public.clean_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM work_item_presence 
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
END;
$$;