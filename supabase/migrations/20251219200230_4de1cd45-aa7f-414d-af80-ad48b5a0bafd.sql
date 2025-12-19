-- Create junction table for linking work items to incidents
CREATE TABLE public.incident_work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('feature', 'story', 'task')),
  work_item_id UUID NOT NULL,
  work_item_key TEXT NOT NULL,
  work_item_title TEXT,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id),
  UNIQUE(incident_id, work_item_type, work_item_id)
);

-- Enable RLS
ALTER TABLE public.incident_work_items ENABLE ROW LEVEL SECURITY;

-- Create policies for approved users
CREATE POLICY "Approved users can view incident work items"
ON public.incident_work_items
FOR SELECT
USING (public.current_user_is_approved());

CREATE POLICY "Approved users can insert incident work items"
ON public.incident_work_items
FOR INSERT
WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can delete incident work items"
ON public.incident_work_items
FOR DELETE
USING (public.current_user_is_approved());

-- Create index for faster lookups
CREATE INDEX idx_incident_work_items_incident_id ON public.incident_work_items(incident_id);
CREATE INDEX idx_incident_work_items_work_item ON public.incident_work_items(work_item_type, work_item_id);