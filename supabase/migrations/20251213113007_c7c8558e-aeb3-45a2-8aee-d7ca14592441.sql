-- Create trigger function for risk_links audit logging
CREATE OR REPLACE FUNCTION public.log_risk_links_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (entity_type, entity_id, action, actor_id, before_json, after_json)
    VALUES ('risks', NEW.risk_id, 'link_added', auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (entity_type, entity_id, action, actor_id, before_json, after_json)
    VALUES ('risks', NEW.risk_id, 'link_updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (entity_type, entity_id, action, actor_id, before_json, after_json)
    VALUES ('risks', OLD.risk_id, 'link_deleted', auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_risk_links_changes ON public.risk_links;

-- Create trigger on risk_links table
CREATE TRIGGER trigger_log_risk_links_changes
AFTER INSERT OR UPDATE OR DELETE ON public.risk_links
FOR EACH ROW EXECUTE FUNCTION public.log_risk_links_changes();