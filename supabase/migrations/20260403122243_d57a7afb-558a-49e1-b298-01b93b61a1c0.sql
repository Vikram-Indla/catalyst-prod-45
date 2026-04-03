CREATE OR REPLACE FUNCTION rh_release_status_activity_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO rh_release_activity_log (
    release_id, actor_name, actor_initials, action, detail, is_ai, created_at
  ) VALUES (
    NEW.id,
    'System',
    'SY',
    'Status changed',
    'Status changed from ' || OLD.status || ' to ' || NEW.status,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rh_release_status_activity ON rh_releases;
CREATE TRIGGER rh_release_status_activity
  AFTER UPDATE ON rh_releases
  FOR EACH ROW
  EXECUTE FUNCTION rh_release_status_activity_fn();