
-- Create a dedicated checklist table for planner_tasks
CREATE TABLE IF NOT EXISTS public.planner_task_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_header BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage checklist items
CREATE POLICY "Users can view planner task checklist items"
  ON public.planner_task_checklist_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert planner task checklist items"
  ON public.planner_task_checklist_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update planner task checklist items"
  ON public.planner_task_checklist_items
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete planner task checklist items"
  ON public.planner_task_checklist_items
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_task_checklist_items;

-- Create index for faster lookups
CREATE INDEX idx_planner_task_checklist_task_id ON public.planner_task_checklist_items(task_id);
