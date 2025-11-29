-- Fix function search_path security warnings by recreating functions with proper search_path

-- Drop triggers first
DROP TRIGGER IF EXISTS external_entities_updated_at ON public.external_entities;
DROP TRIGGER IF EXISTS dependency_audit_trigger ON public.dependencies;

-- Drop functions
DROP FUNCTION IF EXISTS update_external_entities_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_dependency_changes() CASCADE;

-- Recreate update_external_entities_updated_at with search_path
CREATE OR REPLACE FUNCTION update_external_entities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate log_dependency_changes with search_path
CREATE OR REPLACE FUNCTION log_dependency_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
    VALUES (NEW.id, auth.uid(), 'created', 'Dependency created');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 'status', OLD.status::text, NEW.status::text);
    END IF;
    -- Log commitment
    IF OLD.committed_by_date IS NULL AND NEW.committed_by_date IS NOT NULL THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
      VALUES (NEW.id, auth.uid(), 'committed', 'Dependency committed to date: ' || NEW.committed_by_date::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER external_entities_updated_at
  BEFORE UPDATE ON public.external_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_external_entities_updated_at();

CREATE TRIGGER dependency_audit_trigger
  AFTER INSERT OR UPDATE ON public.dependencies
  FOR EACH ROW
  EXECUTE FUNCTION log_dependency_changes();