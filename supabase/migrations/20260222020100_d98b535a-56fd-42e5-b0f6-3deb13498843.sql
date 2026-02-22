
CREATE OR REPLACE FUNCTION fn_ph_initiative_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields TEXT[] := ARRAY['title','description','status','progress','assignee_id','department_id','business_owner_id','target_quarter','budget_allocated','reporter_id','kickoff_date','target_complete','business_ask_date'];
  v_field TEXT;
  v_old TEXT;
  v_new TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.id, v_user_id, 'created', 'initiative', NEW.id, jsonb_build_object('title', NEW.title));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted = true THEN
      INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id)
      VALUES (NEW.id, v_user_id, 'deleted', 'initiative', NEW.id);
      RETURN NEW;
    END IF;

    FOREACH v_field IN ARRAY v_fields LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', v_field, v_field)
        INTO v_old, v_new USING OLD, NEW;
      IF v_old IS DISTINCT FROM v_new THEN
        INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, CASE WHEN v_field = 'status' THEN 'status_changed' ELSE 'updated' END,
                'initiative', NEW.id, v_field, v_old, v_new);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
