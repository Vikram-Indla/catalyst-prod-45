-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-001 · benefit-value creation fails
--
-- ── Root cause ──────────────────────────────────────────────────────────────
-- 20260717160000_strata_assurance_vocabulary.sql narrowed
-- strata_benefit_values.validation_status to the six assurance states
--   (reported · owner_confirmed · independently_validated · accepted_with_exception · rejected · reversed)
-- and rewrote strata_calc_benefit_realization + strata_validate_benefit_value to match — but it did
-- NOT touch strata_create_benefit_value (defined in 20260705190000_strata_authoring_write_paths.sql).
-- That RPC still writes the retired literal 'pending', so EVERY benefit-value create/resubmit now
-- trips strata_benefit_values_validation_status_check. That is the observed error.
--
-- ── Fix (corrective, no schema change) ──────────────────────────────────────
-- 1. New rows are created in the initial assurance state `reported` (submitted, no assurance yet),
--    which is what 'pending' relabelled to in §2 of the vocabulary migration.
-- 2. The stale resubmit guard checked `= 'validated'` — a value the vocabulary migration relabelled
--    to 'independently_validated', so the guard now matches nothing and an ASSURED value could be
--    silently overwritten and reset. It is retargeted at the assured / terminal states so prior
--    assurance and superseded history are never rewritten by a fresh submission.
-- 3. A resubmission of a still-`reported` row resets to `reported` (was: 'pending').
--
-- No constraint, column, grant, or realization-eligibility rule changes here — those already landed
-- correctly in 20260717160000. This only reconciles the create path with that live vocabulary.
-- Baseline / planned / forecast / realized value_kinds are all supported unchanged; currency/unit,
-- period, submitter, evidence (lineage) and audit context are preserved exactly as before.

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

  SELECT * INTO existing FROM public.strata_benefit_values
   WHERE benefit_id = p_benefit AND period_id = p_period AND value_kind = p_value_kind
     AND upload_run_id IS NULL;

  IF existing IS NOT NULL THEN
    -- Never overwrite a value that already carries assurance, has been rejected, or was
    -- reversed/superseded — those transitions are governed and their history is locked.
    IF existing.validation_status IN
        ('owner_confirmed','independently_validated','accepted_with_exception','rejected','reversed') THEN
      RAISE EXCEPTION
        'a % value for % · % is already %; correction requires governance, not resubmission',
        p_value_kind, b.name, per.name, existing.validation_status;
    END IF;
    -- Still only `reported` (no assurance yet) — a plain resubmission may update it in place.
    UPDATE public.strata_benefit_values
       SET value = p_value, submitted_by = auth.uid(), submitted_at = now(),
           validation_status = 'reported', validated_by = NULL, validated_at = NULL, validation_note = NULL,
           updated_at = now()
     WHERE id = existing.id;
    value_id := existing.id;
  ELSE
    INSERT INTO public.strata_benefit_values
      (benefit_id, period_id, value_kind, value, submitted_by, validation_status)
    VALUES (p_benefit, p_period, p_value_kind, p_value, auth.uid(), 'reported')
    RETURNING id INTO value_id;
  END IF;

  INSERT INTO public.strata_lineage_records (entity_table, entity_id, written_by, config_context)
  VALUES ('strata_benefit_values', value_id, auth.uid(),
          jsonb_build_object('channel', 'manual', 'benefit_id', p_benefit,
                             'period_id', p_period, 'value_kind', p_value_kind));

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', value_id, 'RPC:create_benefit_value', auth.uid(),
          format('%s value %s for %s · %s (reported, awaiting assurance)', p_value_kind, p_value, b.name, per.name));
  RETURN value_id;
END;
$$;
