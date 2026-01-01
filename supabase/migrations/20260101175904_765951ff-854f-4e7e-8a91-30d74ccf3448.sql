-- Fix cleanup_user_data function: remove invalid reference to programs.rte_id
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reassign or nullify owner_id and assignee_id fields
  UPDATE public.strategic_themes SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.initiatives SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.epics SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.features SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.stories SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.stories SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.subtasks SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.risks SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.objectives SET owner_id = NULL WHERE owner_id = OLD.id;

  RETURN OLD;
END;
$$;