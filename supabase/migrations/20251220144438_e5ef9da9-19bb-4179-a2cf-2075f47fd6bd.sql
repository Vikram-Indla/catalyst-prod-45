-- Add missing committee tracking fields to incidents table
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS committee_set_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS committee_set_by UUID REFERENCES public.incident_user_profiles(id);

-- Create function to validate committee transition
CREATE OR REPLACE FUNCTION public.validate_committee_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  -- Only validate when status is being set to 'to_committee'
  IF NEW.status = 'to_committee' AND (OLD.status IS NULL OR OLD.status != 'to_committee') THEN
    -- Check if committee_id is set
    IF NEW.committee_id IS NULL THEN
      RAISE EXCEPTION 'Cannot move to Committee status without a committee configured';
    END IF;
    
    -- Check if committee has at least 1 approver
    SELECT COUNT(*) INTO member_count
    FROM public.committee_members
    WHERE committee_id = NEW.committee_id;
    
    IF member_count < 1 THEN
      RAISE EXCEPTION 'Add at least one approver to place in Committee';
    END IF;
    
    -- Set committee tracking fields
    NEW.committee_set_at := NOW();
    NEW.committee_set_by := auth.uid();
    NEW.requires_committee := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for committee validation
DROP TRIGGER IF EXISTS validate_committee_transition_trigger ON public.incidents;
CREATE TRIGGER validate_committee_transition_trigger
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_committee_transition();

-- Create function to log committee status changes
CREATE OR REPLACE FUNCTION public.log_committee_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when status changes to Committee
  IF NEW.status = 'to_committee' AND (OLD.status IS NULL OR OLD.status != 'to_committee') THEN
    INSERT INTO public.incident_history (
      incident_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      'status',
      OLD.status::text,
      'to_committee',
      auth.uid(),
      NOW()
    );
  END IF;
  
  -- Log when committee_id changes (approvers configured)
  IF NEW.committee_id IS DISTINCT FROM OLD.committee_id AND NEW.committee_id IS NOT NULL THEN
    INSERT INTO public.incident_history (
      incident_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      'committee_approvers',
      CASE WHEN OLD.committee_id IS NULL THEN 'None' ELSE OLD.committee_id::text END,
      'Committee configured: ' || NEW.committee_id::text,
      auth.uid(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for committee audit logging
DROP TRIGGER IF EXISTS log_committee_status_change_trigger ON public.incidents;
CREATE TRIGGER log_committee_status_change_trigger
  AFTER UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_committee_status_change();

-- Add index for committee queries
CREATE INDEX IF NOT EXISTS idx_incidents_committee_status 
ON public.incidents(status) 
WHERE status = 'to_committee';