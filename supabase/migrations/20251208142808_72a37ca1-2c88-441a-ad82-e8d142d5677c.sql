-- Add programEpicInherited flag to features table
-- When true, the feature's program is inherited from its parent epic
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS program_epic_inherited boolean DEFAULT true;

-- Update existing features to have inherited = false if they have explicit program_id
UPDATE public.features 
SET program_epic_inherited = false 
WHERE program_id IS NOT NULL;

-- Create a function to auto-sync program from epic when inherited
CREATE OR REPLACE FUNCTION public.sync_feature_program_from_epic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If program_epic_inherited is true and epic_id is set, copy program from epic
  IF NEW.program_epic_inherited = true AND NEW.epic_id IS NOT NULL THEN
    SELECT primary_program_id INTO NEW.program_id
    FROM epics
    WHERE id = NEW.epic_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync program on insert/update
DROP TRIGGER IF EXISTS trigger_sync_feature_program ON public.features;
CREATE TRIGGER trigger_sync_feature_program
  BEFORE INSERT OR UPDATE OF epic_id, program_epic_inherited
  ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_feature_program_from_epic();