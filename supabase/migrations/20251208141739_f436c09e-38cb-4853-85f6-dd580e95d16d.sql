-- Create work_item_key_history table to track key changes/aliases
CREATE TABLE public.work_item_key_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'story', 'defect', 'task', 'subtask', 'demand')),
  old_key TEXT NOT NULL,
  new_key TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX idx_work_item_key_history_item ON public.work_item_key_history(work_item_id, work_item_type);
CREATE INDEX idx_work_item_key_history_old_key ON public.work_item_key_history(old_key);
CREATE INDEX idx_work_item_key_history_new_key ON public.work_item_key_history(new_key);

-- Enable RLS
ALTER TABLE public.work_item_key_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view key history"
  ON public.work_item_key_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert key history"
  ON public.work_item_key_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);