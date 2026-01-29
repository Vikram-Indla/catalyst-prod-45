-- Create planner_task_lead_notes table for manager/lead notes on tasks
CREATE TABLE public.planner_task_lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_task_lead_notes ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_planner_task_lead_notes_task_id ON public.planner_task_lead_notes(task_id);
CREATE INDEX idx_planner_task_lead_notes_author_id ON public.planner_task_lead_notes(author_id);

-- RLS Policies:
-- Everyone authenticated can view notes
CREATE POLICY "Authenticated users can view lead notes"
ON public.planner_task_lead_notes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only workstream leads or management roles can insert notes
-- Uses security definer function to check permissions
CREATE OR REPLACE FUNCTION public.can_manage_lead_notes(task_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID := auth.uid();
  user_role TEXT;
  workstream_uuid UUID;
  is_workstream_lead BOOLEAN := FALSE;
  has_management_role BOOLEAN := FALSE;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's system role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = can_manage_lead_notes.user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Admin or program_manager can always manage
  IF user_role IN ('admin', 'program_manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check for super_admin or management product role
  SELECT EXISTS(
    SELECT 1 
    FROM user_product_roles upr
    JOIN product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = can_manage_lead_notes.user_id
    AND pr.code IN ('super_admin', 'management')
  ) INTO has_management_role;
  
  IF has_management_role THEN
    RETURN TRUE;
  END IF;
  
  -- Get workstream from task
  SELECT workstream_id INTO workstream_uuid
  FROM planner_tasks
  WHERE id = task_uuid;
  
  IF workstream_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is lead of the workstream
  SELECT EXISTS(
    SELECT 1
    FROM workstream_members wm
    WHERE wm.workstream_id = workstream_uuid
    AND wm.user_id = can_manage_lead_notes.user_id
    AND LOWER(wm.role) = 'lead'
  ) INTO is_workstream_lead;
  
  RETURN is_workstream_lead;
END;
$$;

-- Insert policy: only leads/management can insert
CREATE POLICY "Leads and management can insert lead notes"
ON public.planner_task_lead_notes
FOR INSERT
WITH CHECK (can_manage_lead_notes(task_id));

-- Update policy: only author or leads/management can update
CREATE POLICY "Author or leads can update lead notes"
ON public.planner_task_lead_notes
FOR UPDATE
USING (
  author_id = auth.uid() 
  OR can_manage_lead_notes(task_id)
);

-- Delete policy: only author or leads/management can delete
CREATE POLICY "Author or leads can delete lead notes"
ON public.planner_task_lead_notes
FOR DELETE
USING (
  author_id = auth.uid()
  OR can_manage_lead_notes(task_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_planner_task_lead_notes_updated_at
BEFORE UPDATE ON public.planner_task_lead_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();