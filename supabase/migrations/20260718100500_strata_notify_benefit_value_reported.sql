-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-001/003 · retire the last 'pending' reference
--
-- strata_tg_notify_benefit_value fired the validator "please validate" notification only when
-- validation_status = 'pending'. The assurance vocabulary migration (20260717160000) retired
-- 'pending' → 'reported', so this comparison went dead and validators stopped being notified.
-- Forward-only, idempotent: fire on the initial assurance state 'reported'. No behaviour else changes.
CREATE OR REPLACE FUNCTION public.strata_tg_notify_benefit_value()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_validator uuid; v_name text;
BEGIN
  IF NEW.validation_status = 'reported' THEN
    SELECT validator_id, name INTO v_validator, v_name FROM public.strata_benefits WHERE id = NEW.benefit_id;
    IF v_validator IS NOT NULL
       AND v_validator <> COALESCE(NEW.submitted_by, '00000000-0000-0000-0000-000000000000') THEN
      PERFORM public.strata_notify(
        v_validator, 'benefit_validation_requested', 'strata_benefit_values', NEW.id,
        format('Assure %s value', public.labelize_noop(NEW.value_kind)),
        COALESCE(v_name, 'benefit'));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
