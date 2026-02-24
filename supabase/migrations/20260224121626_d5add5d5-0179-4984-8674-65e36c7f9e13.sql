-- Fix the broken log_risk_changes trigger that references a nonexistent initiative_id column
CREATE OR REPLACE FUNCTION log_risk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs(entity_id, entity_type, action, actor_id, after_json)
    VALUES (NEW.id, 'risk', 'created', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs(entity_id, entity_type, action, actor_id, before_json, after_json)
    VALUES (NEW.id, 'risk', 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_id, entity_type, action, actor_id, before_json)
    VALUES (OLD.id, 'risk', 'deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;