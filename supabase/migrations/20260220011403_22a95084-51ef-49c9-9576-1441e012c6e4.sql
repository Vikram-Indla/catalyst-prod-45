
-- ============================================================
-- AUDIT TRIGGERS for Initiative Detail Panel
-- Populates ph_initiative_audit_log on changes to:
--   ph_initiatives, ph_initiative_budget_items, ph_initiative_risks
-- ============================================================

-- 1. Trigger function for ph_initiatives field-level changes
CREATE OR REPLACE FUNCTION fn_ph_initiative_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_fields TEXT[] := ARRAY['title','description','status','progress','assignee_id','department_id','business_owner_id','target_quarter','budget_allocated','reporter_id','kickoff_date','target_complete','business_ask_date'];
  v_field TEXT;
  v_old TEXT;
  v_new TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.id, NEW.created_by, 'created', 'initiative', NEW.id, jsonb_build_object('title', NEW.title));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Check soft delete
    IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted = true THEN
      INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id)
      VALUES (NEW.id, NULL, 'deleted', 'initiative', NEW.id);
      RETURN NEW;
    END IF;

    -- Track field-level changes
    FOREACH v_field IN ARRAY v_fields LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', v_field, v_field)
        INTO v_old, v_new USING OLD, NEW;
      IF v_old IS DISTINCT FROM v_new THEN
        INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
        VALUES (NEW.id, NULL, CASE WHEN v_field = 'status' THEN 'status_changed' ELSE 'updated' END,
                'initiative', NEW.id, v_field, v_old, v_new);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ph_initiative_audit ON ph_initiatives;
CREATE TRIGGER trg_ph_initiative_audit
  AFTER INSERT OR UPDATE ON ph_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION fn_ph_initiative_audit();

-- 2. Trigger function for budget items
CREATE OR REPLACE FUNCTION fn_ph_budget_item_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, NEW.created_by, 'budget_item_added', 'budget_item', NEW.id,
            jsonb_build_object('title', NEW.description, 'category', NEW.category, 'amount', NEW.planned_amount));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, NULL, 'deleted', 'budget_item', OLD.id,
            jsonb_build_object('title', OLD.description));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ph_budget_item_audit ON ph_initiative_budget_items;
CREATE TRIGGER trg_ph_budget_item_audit
  AFTER INSERT OR DELETE ON ph_initiative_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_ph_budget_item_audit();

-- 3. Trigger function for risks
CREATE OR REPLACE FUNCTION fn_ph_risk_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.initiative_id, NEW.created_by, 'risk_added', 'risk', NEW.id,
            jsonb_build_object('title', NEW.title, 'risk_key', NEW.risk_key, 'severity',
              CASE WHEN NEW.risk_score >= 20 THEN 'Critical' WHEN NEW.risk_score >= 15 THEN 'High'
                   WHEN NEW.risk_score >= 8 THEN 'Medium' ELSE 'Low' END));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.initiative_id, NULL, 'deleted', 'risk', OLD.id,
            jsonb_build_object('title', OLD.title, 'risk_key', OLD.risk_key));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ph_risk_audit ON ph_initiative_risks;
CREATE TRIGGER trg_ph_risk_audit
  AFTER INSERT OR DELETE ON ph_initiative_risks
  FOR EACH ROW
  EXECUTE FUNCTION fn_ph_risk_audit();

-- 4. Trigger for score updates
CREATE OR REPLACE FUNCTION fn_ph_score_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.weighted_score IS DISTINCT FROM NEW.weighted_score THEN
      INSERT INTO ph_initiative_audit_log (initiative_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value)
      VALUES (NEW.initiative_id, NULL, 'score_updated', 'score', NEW.id, 'weighted_score',
              OLD.weighted_score::text, NEW.weighted_score::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ph_score_audit ON ph_initiative_scores;
CREATE TRIGGER trg_ph_score_audit
  AFTER UPDATE ON ph_initiative_scores
  FOR EACH ROW
  EXECUTE FUNCTION fn_ph_score_audit();
