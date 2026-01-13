-- Create planner_checklist_items table for storing checklist data
CREATE TABLE public.planner_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_header BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can CRUD checklist items
CREATE POLICY "Authenticated users can view checklist items"
ON public.planner_checklist_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create checklist items"
ON public.planner_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update checklist items"
ON public.planner_checklist_items
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete checklist items"
ON public.planner_checklist_items
FOR DELETE
TO authenticated
USING (true);

-- Index for efficient queries by story_id
CREATE INDEX idx_planner_checklist_items_story_id ON public.planner_checklist_items(story_id);

-- Trigger for updated_at
CREATE TRIGGER update_planner_checklist_items_updated_at
BEFORE UPDATE ON public.planner_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for checklist items
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_checklist_items;