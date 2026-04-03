
CREATE OR REPLACE FUNCTION rh_release_outbound_trigger_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.jira_key IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO sync_events (
    direction, origin_system, event_type,
    entity_type, entity_id, idempotency_key,
    payload, status
  ) VALUES (
    'outbound', 'catalyst', 'release_created',
    'rh_release', NEW.id::text,
    'catalyst:release:' || NEW.id::text || ':created',
    jsonb_build_object(
      'id',          NEW.id,
      'name',        NEW.name,
      'description', NEW.description,
      'target_date', NEW.target_date,
      'status',      NEW.status,
      'project_id',  NEW.project_id
    ),
    'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rh_release_outbound_trigger ON rh_releases;

CREATE TRIGGER rh_release_outbound_trigger
  AFTER INSERT ON rh_releases
  FOR EACH ROW
  EXECUTE FUNCTION rh_release_outbound_trigger_fn();

-- RPC: queue a Jira version import request
CREATE OR REPLACE FUNCTION rh_import_jira_versions(
  p_project_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_idempotency_key text;
  v_existing_count  int;
BEGIN
  v_idempotency_key := 'catalyst:import:versions:' ||
                        p_project_key || ':' ||
                        to_char(now(), 'YYYY-MM-DD-HH24');

  SELECT COUNT(*) INTO v_existing_count
  FROM sync_events
  WHERE idempotency_key = v_idempotency_key;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'queued', false,
      'reason', 'Import already requested this hour'
    );
  END IF;

  INSERT INTO sync_events (
    direction, origin_system, event_type,
    entity_type, entity_id, idempotency_key,
    payload, status
  ) VALUES (
    'inbound', 'jira', 'import_versions',
    'rh_release', p_project_key, v_idempotency_key,
    jsonb_build_object('project_key', p_project_key),
    'pending'
  );

  RETURN jsonb_build_object('queued', true, 'project_key', p_project_key);
END;
$$;
