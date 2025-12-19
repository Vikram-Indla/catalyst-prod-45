-- Add project_id column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Create index for performance
CREATE INDEX idx_incidents_project_id ON public.incidents(project_id);

-- Add audit log entry for project changes (trigger)
CREATE OR REPLACE FUNCTION public.log_incident_project_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    INSERT INTO public.incident_history (
      incident_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      'project_id',
      OLD.project_id::text,
      NEW.project_id::text,
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for project changes
DROP TRIGGER IF EXISTS trigger_incident_project_change ON public.incidents;
CREATE TRIGGER trigger_incident_project_change
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_incident_project_change();