CREATE OR REPLACE FUNCTION public.fn_ph_score_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.computed_score IS DISTINCT FROM NEW.computed_score THEN
      INSERT INTO public.ph_initiative_audit_log (
        initiative_id,
        user_id,
        action,
        entity_type,
        entity_id,
        field_name,
        old_value,
        new_value
      )
      VALUES (
        NEW.initiative_id,
        NEW.scored_by,
        'score_updated',
        'score',
        NEW.id,
        'computed_score',
        OLD.computed_score::text,
        NEW.computed_score::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;