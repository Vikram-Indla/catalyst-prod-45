-- Function to check if a theme is active
CREATE OR REPLACE FUNCTION public.check_theme_is_active(p_theme_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
BEGIN
  IF p_theme_id IS NULL THEN
    RETURN true; -- Allow null theme_id (unlinking)
  END IF;
  
  SELECT status INTO v_status
  FROM public.strategic_themes
  WHERE id = p_theme_id;
  
  IF v_status IS NULL THEN
    RETURN true; -- Theme not found, let FK handle it
  END IF;
  
  RETURN v_status = 'active';
END;
$function$;

-- Trigger function to validate theme linking for epics
CREATE OR REPLACE FUNCTION public.validate_epic_theme_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when theme_id is being set or changed
  IF NEW.theme_id IS NOT NULL AND (OLD IS NULL OR OLD.theme_id IS DISTINCT FROM NEW.theme_id) THEN
    IF NOT check_theme_is_active(NEW.theme_id) THEN
      RAISE EXCEPTION 'Cannot link epic to theme: theme must be in "active" status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger function to validate theme linking for objectives
CREATE OR REPLACE FUNCTION public.validate_objective_theme_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when theme_id is being set or changed
  IF NEW.theme_id IS NOT NULL AND (OLD IS NULL OR OLD.theme_id IS DISTINCT FROM NEW.theme_id) THEN
    IF NOT check_theme_is_active(NEW.theme_id) THEN
      RAISE EXCEPTION 'Cannot link objective to theme: theme must be in "active" status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger function to validate snapshot linking for themes
CREATE OR REPLACE FUNCTION public.validate_theme_snapshot_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when snapshot_id is being set or changed
  IF NEW.snapshot_id IS NOT NULL AND (OLD IS NULL OR OLD.snapshot_id IS DISTINCT FROM NEW.snapshot_id) THEN
    IF NEW.status != 'active' THEN
      RAISE EXCEPTION 'Cannot link theme to snapshot: theme must be in "active" status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers
DROP TRIGGER IF EXISTS validate_epic_theme_link_trigger ON public.epics;
CREATE TRIGGER validate_epic_theme_link_trigger
  BEFORE INSERT OR UPDATE ON public.epics
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_epic_theme_link();

DROP TRIGGER IF EXISTS validate_objective_theme_link_trigger ON public.objectives;
CREATE TRIGGER validate_objective_theme_link_trigger
  BEFORE INSERT OR UPDATE ON public.objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_objective_theme_link();

DROP TRIGGER IF EXISTS validate_theme_snapshot_link_trigger ON public.strategic_themes;
CREATE TRIGGER validate_theme_snapshot_link_trigger
  BEFORE INSERT OR UPDATE ON public.strategic_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_theme_snapshot_link();