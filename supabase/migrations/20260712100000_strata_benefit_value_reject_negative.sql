-- V4-OPEN-021 · Reject negative / non-finite benefit values server-side.
-- The Add-value flow (Portfolio → Benefit → Add value) accepted -100 and
-- persisted it as pending. The client now guards on submit, but the RPC is the
-- authoritative gate: this redefines strata_create_benefit_value (originally
-- 20260705190000_strata_authoring_write_paths.sql) to reject values that are
-- negative, NaN or ±Infinity. NaN needs an explicit term — Postgres orders NaN
-- as greater than every numeric, so `p_value >= 0` would let NaN through.
CREATE OR REPLACE FUNCTION public.strata_create_benefit_value(
  p_benefit uuid,
  p_period uuid,
  p_value_kind text,
  p_value numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; per record; existing record; value_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kpi_owner','data_steward','strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'submitting a benefit value requires kpi_owner, data_steward, strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = p_benefit;
  IF b IS NULL THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF b.lifecycle_stage = 'closed' THEN RAISE EXCEPTION 'closed benefits cannot receive values'; END IF;
  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  IF per.close_status = 'closed' THEN RAISE EXCEPTION 'period % is closed; values cannot be submitted', per.name; END IF;
  IF p_value_kind NOT IN ('baseline','planned','forecast','realized') THEN
    RAISE EXCEPTION 'value kind must be baseline | planned | forecast | realized';
  END IF;
  IF p_value IS NULL THEN RAISE EXCEPTION 'value is required'; END IF;
  IF p_value = 'NaN'::numeric OR p_value = 'Infinity'::numeric
     OR p_value = '-Infinity'::numeric OR p_value < 0 THEN
    RAISE EXCEPTION 'value must be a finite, non-negative number';
  END IF;

  SELECT * INTO existing FROM public.strata_benefit_values
   WHERE benefit_id = p_benefit AND period_id = p_period AND value_kind = p_value_kind
     AND upload_run_id IS NULL;

  IF existing IS NOT NULL THEN
    IF existing.validation_status = 'validated' THEN
      RAISE EXCEPTION 'a validated % value already exists for % · %; correction requires governance', p_value_kind, b.name, per.name;
    END IF;
    UPDATE public.strata_benefit_values
       SET value = p_value, submitted_by = auth.uid(), submitted_at = now(),
           validation_status = 'pending', validated_by = NULL, validated_at = NULL, validation_note = NULL,
           updated_at = now()
     WHERE id = existing.id;
    value_id := existing.id;
  ELSE
    INSERT INTO public.strata_benefit_values
      (benefit_id, period_id, value_kind, value, submitted_by, validation_status)
    VALUES (p_benefit, p_period, p_value_kind, p_value, auth.uid(), 'pending')
    RETURNING id INTO value_id;
  END IF;

  INSERT INTO public.strata_lineage_records (entity_table, entity_id, written_by, config_context)
  VALUES ('strata_benefit_values', value_id, auth.uid(),
          jsonb_build_object('channel', 'manual', 'benefit_id', p_benefit,
                             'period_id', p_period, 'value_kind', p_value_kind));

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', value_id, 'RPC:create_benefit_value', auth.uid(),
          format('%s value %s for %s · %s (pending validation)', p_value_kind, p_value, b.name, per.name));
  RETURN value_id;
END;
$$;
