
-- Create a trigger function to log business request creation
CREATE OR REPLACE FUNCTION public.log_business_request_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert audit log for creation
  INSERT INTO public.business_request_audit_logs (
    business_request_id,
    action,
    actor_id,
    actor_name,
    field_changed,
    old_value,
    new_value
  ) VALUES (
    NEW.id,
    'CREATE',
    COALESCE(auth.uid(), NEW.created_by),
    COALESCE(NEW.requestor, 'System'),
    'Request Created',
    NULL,
    NEW.title
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger (if not exists)
DROP TRIGGER IF EXISTS log_business_request_create_trigger ON public.business_requests;

CREATE TRIGGER log_business_request_create_trigger
  AFTER INSERT ON public.business_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_business_request_create();
