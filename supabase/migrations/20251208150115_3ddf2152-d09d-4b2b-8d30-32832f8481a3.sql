-- Create work item watchers table
CREATE TABLE public.work_item_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_type TEXT NOT NULL,
  work_item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(work_item_type, work_item_id, user_id)
);

-- Enable RLS
ALTER TABLE public.work_item_watchers ENABLE ROW LEVEL SECURITY;

-- Users can view watchers on any work item
CREATE POLICY "Users can view work item watchers"
ON public.work_item_watchers
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can watch work items
CREATE POLICY "Users can watch work items"
ON public.work_item_watchers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unwatch work items they're watching
CREATE POLICY "Users can unwatch work items"
ON public.work_item_watchers
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for efficient lookups
CREATE INDEX idx_work_item_watchers_item ON public.work_item_watchers(work_item_type, work_item_id);
CREATE INDEX idx_work_item_watchers_user ON public.work_item_watchers(user_id);