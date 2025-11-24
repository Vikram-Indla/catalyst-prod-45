-- Update cleanup_user_data function to remove business_requests reference
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  UPDATE public.portfolios SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.programs SET rte_id = NULL WHERE rte_id = OLD.id;
  UPDATE public.objectives SET owner_id = NULL WHERE owner_id = OLD.id;
  
  RETURN OLD;
END;
$function$;