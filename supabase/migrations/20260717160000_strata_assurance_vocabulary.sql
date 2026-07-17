-- CAT-STRATA-IMPL-20260712-001 · R4a · assurance vocabulary + exception governance (D-4, D-5, E-6, F-6, F-7)
-- Plan Lock: blueprint §6 (G1, D-4), §7 (backfill) · authorization R4.
--
-- ── D-4: the label is a lie today, and this removes it ──────────────────────
-- Probed: `finance_validated` lives on strata_benefits.lifecycle_stage (NOT on benefit_values), and
-- strata_validate_benefit_value hardcodes it on ANY validator's verdict. There is NO Finance role or
-- actor anywhere in STRATA — the RPC gates on the benefit's validator_id or the vmo_validator role.
-- So the system has been stamping "finance validated" on records that Finance never touched.
-- D-4: neutral states, and **do not claim historical Finance assurance**.
--
-- ── This is a RELABEL, not a re-assertion (D-4 / §7) ────────────────────────
--   benefit_values.validation_status : pending(15) -> reported · validated(13) -> independently_validated
--   benefits.lifecycle_stage         : finance_validated(1) -> independently_validated
-- No row gains or loses assurance; validated_by / validated_at / validation_note and every audit
-- event are untouched. The actor who validated is still recorded — only the WORD changes, from one
-- that named a department that was never involved to one that describes what actually happened.
--
-- ── F-7: owner_confirmed COUNTS — and this is the live-numbers change ───────
-- "Owner-confirmed benefits count" (authorization). strata_calc_benefit_realization whitelists
-- ='validated' today, so widening it is a REAL change to reported benefit realization.
-- **Measured before shipping: it moves NOTHING today.** owner_confirmed and accepted_with_exception
-- are new states with ZERO rows, and validated->independently_validated is the same 13 rows under a
-- new name. The rule is in force from now; the numbers only move when someone actually marks a value
-- owner-confirmed, which is exactly what F-7 intends. A change that moves numbers on the day it ships
-- would have been a silent restatement of history.
--
-- ── E-6 / F-6: exception governance, and where it does NOT go ───────────────
-- E-6 spans BOTH KPI actuals and benefit values. F-6 rules benefit values get
-- `accepted_with_exception` ONLY — **not** `quarantined`: adding quarantine to benefits would imply a
-- benefit-quarantine workflow that does not exist and was not asked for.
-- `quarantined` already exists on strata_kpi_actuals (§9 correct) — only the exception state is new.
--
-- ⚠️ Acceptance for calculation does NOT imply independent validation (E-6). That is why
-- accepted_with_exception is its OWN state and never collapses into independently_validated: the
-- flag must stay visible downstream, and a value that counted *by exception* must never later read
-- as one that was independently validated.

-- ── 1. benefit lifecycle: retire the Finance claim ──────────────────────────
-- Order matters: migrate the DATA, then tighten the CHECK. Adding the constraint first fails
-- outright on the existing finance_validated row — which is the constraint doing its job, but it
-- means the relabel must land before the vocabulary narrows.
ALTER TABLE public.strata_benefits DROP CONSTRAINT IF EXISTS strata_benefits_lifecycle_stage_check;
UPDATE public.strata_benefits SET lifecycle_stage = 'independently_validated'
 WHERE lifecycle_stage = 'finance_validated';
ALTER TABLE public.strata_benefits
  ADD CONSTRAINT strata_benefits_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('identified','qualified','approved','baselined','in_flight',
                             'forecast_revised','realized','independently_validated','closed'));

-- ── 2. benefit value assurance vocabulary (D-4 + E-6 + authorization R4) ────
-- Reported · Owner confirmed · Independently validated · Accepted with exception · Rejected ·
-- Reversed/superseded. Six states, each meaning something different to a reader of a number.
ALTER TABLE public.strata_benefit_values DROP CONSTRAINT IF EXISTS strata_benefit_values_validation_status_check;
UPDATE public.strata_benefit_values SET validation_status = 'reported'                 WHERE validation_status = 'pending';
UPDATE public.strata_benefit_values SET validation_status = 'independently_validated'  WHERE validation_status = 'validated';
ALTER TABLE public.strata_benefit_values
  ADD CONSTRAINT strata_benefit_values_validation_status_check
  CHECK (validation_status IN ('reported','owner_confirmed','independently_validated',
                               'accepted_with_exception','rejected','reversed'));

-- ── 3. KPI actuals: the exception state (quarantined already exists) ────────
ALTER TABLE public.strata_kpi_actuals DROP CONSTRAINT IF EXISTS strata_kpi_actuals_validation_status_check;
ALTER TABLE public.strata_kpi_actuals
  ADD CONSTRAINT strata_kpi_actuals_validation_status_check
  CHECK (validation_status IN ('pending','validated','rejected','quarantined','accepted_with_exception','reversed'));

-- ── 4. exception provenance — on BOTH, per E-6 ─────────────────────────────
-- E-6: "exception reason, original failures, evidence, actor, timestamp remain VISIBLE downstream".
-- These are columns rather than a note because a downstream consumer must be able to READ them, not
-- parse prose out of a free-text field.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_kpi_actuals','strata_benefit_values'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS exception_reason text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS exception_authorized_by uuid', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS exception_authorized_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS original_validation_failures jsonb', t);

    -- An exception without a reason and an authorizer is not an exception — it is an unexplained
    -- number that counts. The CHECK makes that unrepresentable rather than merely discouraged.
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t||'_exception_complete');
    EXECUTE format($f$ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        validation_status <> 'accepted_with_exception'
        OR (exception_reason IS NOT NULL AND btrim(exception_reason) <> ''
            AND exception_authorized_by IS NOT NULL AND exception_authorized_at IS NOT NULL))$f$,
      t, t||'_exception_complete');

    -- D-5/E-6: "submitters cannot authorize their own exceptions". At the DB, not just in the RPC —
    -- the RPCs are SECURITY DEFINER and bypass RLS, so this is the layer that binds every writer.
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t||'_exception_no_self_auth');
    EXECUTE format($f$ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        exception_authorized_by IS NULL OR submitted_by IS NULL
        OR exception_authorized_by <> submitted_by)$f$,
      t, t||'_exception_no_self_auth');
  END LOOP;
END $$;

COMMENT ON COLUMN public.strata_benefit_values.validation_status IS
  'Assurance state (D-4/E-6). reported = submitted, no assurance yet. owner_confirmed = the owner stands behind it (COUNTS per F-7, but is NOT independent validation). independently_validated = checked by someone other than the submitter. accepted_with_exception = COUNTS by Strategy Office authorization despite failing validation — the flag stays visible downstream and NEVER collapses into independently_validated. rejected / reversed do not count.';
COMMENT ON COLUMN public.strata_kpi_actuals.validation_status IS
  'quarantined and rejected do NOT count. validated and accepted_with_exception DO (E-6). NOTE: `pending` also counts today via strata_calc_kpi_achievement''s fallback (confidence x0.6) — a known gap against E-7 condition 3, tracked separately.';

-- ── 5. the calc — F-7's widening, and the reason it MUST land in this migration ──
-- The vocabulary migration above renames `validated` out of existence. strata_calc_benefit_realization
-- filters ='validated', so between the two statements benefit realization would silently read ZERO.
-- Splitting these across migrations would ship a window where every benefit reports no realized value.
-- Hence: same migration, atomically.
--
-- F-7: "Owner-confirmed benefits count." E-6: validated AND accepted-with-exception count;
-- rejected does not. `reported` does NOT count — it has no assurance at all, and counting it would
-- make "reported" and "validated" indistinguishable in a number, which is the whole point of D-4.
-- `reversed` does not count (D-7/E-5).
--
-- E-6: "Acceptance for calculation does NOT imply independent validation." The three counting states
-- are therefore reported SEPARATELY in the provenance (assurance_composition), so a reader can see
-- WHAT KIND of assurance produced a realization index rather than a single opaque total. That is the
-- authorization's "assurance-composition reporting".
CREATE OR REPLACE FUNCTION public.strata_calc_benefit_realization(p_benefit uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  planned numeric; realized numeric; forecast numeric; idx numeric; runs uuid[];
  v_value_ids jsonb; v_as_of timestamptz; v_composition jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  v_as_of := now();

  SELECT sum(value) FILTER (WHERE value_kind = 'planned'),
         -- F-7 + E-6: the three states that carry assurance a number may rest on.
         sum(value) FILTER (WHERE value_kind = 'realized'
                              AND validation_status IN ('independently_validated','owner_confirmed','accepted_with_exception')),
         sum(value) FILTER (WHERE value_kind = 'forecast'),
         COALESCE(array_agg(DISTINCT upload_run_id) FILTER (WHERE upload_run_id IS NOT NULL), '{}')
    INTO planned, realized, forecast, runs
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND p.starts_on <= now()::date;

  -- Assurance composition (authorization R4): WHICH assurance the realized figure rests on.
  -- A realization index built entirely from owner_confirmed values is a very different claim from
  -- one that was independently validated — a single total hides that; this does not.
  SELECT jsonb_build_object(
           'independently_validated', COALESCE(sum(value) FILTER (WHERE validation_status='independently_validated'), 0),
           'owner_confirmed',         COALESCE(sum(value) FILTER (WHERE validation_status='owner_confirmed'), 0),
           'accepted_with_exception', COALESCE(sum(value) FILTER (WHERE validation_status='accepted_with_exception'), 0),
           'excluded_reported',       COALESCE(sum(value) FILTER (WHERE validation_status='reported'), 0),
           'excluded_rejected',       COALESCE(sum(value) FILTER (WHERE validation_status='rejected'), 0),
           'excluded_reversed',       COALESCE(sum(value) FILTER (WHERE validation_status='reversed'), 0))
    INTO v_composition
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND bv.value_kind = 'realized' AND p.starts_on <= now()::date;

  SELECT jsonb_agg(jsonb_build_object('id', bv.id, 'value_kind', bv.value_kind,
                                      'validation_status', bv.validation_status, 'period_id', bv.period_id,
                                      'exception_reason', bv.exception_reason,
                                      'exception_authorized_by', bv.exception_authorized_by))
    INTO v_value_ids
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND p.starts_on <= now()::date;

  idx := CASE WHEN planned IS NULL OR planned = 0 THEN NULL ELSE COALESCE(realized, 0) / planned END;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, formula_version, inputs, source_run_ids, config_context)
  VALUES ('benefit', p_benefit, 'realization_index', idx, 'realization:v1',
          jsonb_build_object('planned_to_date', planned, 'realized_counted', realized, 'forecast', forecast,
                             'assurance_composition', v_composition),
          runs,
          jsonb_build_object(
            'provenance_schema', 1,
            'assurance_rule', 'realized counts independently_validated + owner_confirmed (F-7) + accepted_with_exception (E-6). reported/rejected/reversed do NOT count. Acceptance for calculation does not imply independent validation.',
            'assurance_composition', v_composition,
            'period_cutoff_rule', 'benefit values whose period starts_on <= today',
            'resolved_as_of', v_as_of,
            'benefit_values', v_value_ids));

  RETURN jsonb_build_object('benefit_id', p_benefit, 'realization_index', round(coalesce(idx,0), 4),
                            'has_data', idx IS NOT NULL,
                            'planned_to_date', planned, 'realized_validated', realized,
                            'assurance_composition', v_composition,
                            'forecast', forecast,
                            'source_run_ids', runs, 'calculated_at', now());
END;
$function$;

-- ── 6. the benefit assurance RPC — stop writing a Finance claim ─────────────
-- Verdicts are now the D-4 vocabulary. `owner_confirmed` is deliberately allowed to the benefit's
-- OWNER (not only a validator): that is what the state MEANS — the owner standing behind their own
-- number. It still cannot be self-submitted-and-confirmed... except that owner-confirmation of one's
-- own submission is precisely the point, so SoD applies only to INDEPENDENT validation, which is the
-- only state that claims someone else checked it.
CREATE OR REPLACE FUNCTION public.strata_validate_benefit_value(p_value uuid, p_verdict text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v record; b record;
BEGIN
  IF p_verdict NOT IN ('owner_confirmed','independently_validated','rejected') THEN
    RAISE EXCEPTION 'verdict must be owner_confirmed | independently_validated | rejected (an exception is authorized via strata_authorize_benefit_exception)';
  END IF;
  SELECT * INTO v FROM public.strata_benefit_values WHERE id = p_value;
  IF v.id IS NULL THEN RAISE EXCEPTION 'benefit value not found'; END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = v.benefit_id;

  IF p_verdict = 'owner_confirmed' THEN
    -- The OWNER confirms; that is the state's meaning. No SoD: confirming your own submission is
    -- exactly what "owner confirmed" claims, and it claims nothing more.
    IF NOT (auth.uid() = b.accountable_owner_id OR public.strata_has_role(ARRAY['strategy_office'])) THEN
      RAISE EXCEPTION 'owner confirmation requires the benefit''s accountable owner (or strategy_office/admin)';
    END IF;
  ELSE
    IF NOT (auth.uid() = b.validator_id OR public.strata_has_role(ARRAY['vmo_validator'])) THEN
      RAISE EXCEPTION 'benefit validation requires the benefit validator or a vmo_validator/admin role';
    END IF;
    -- SoD applies ONLY to independent validation — the one verdict that asserts someone else checked it.
    IF p_verdict = 'independently_validated' AND v.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'segregation of duties: the submitter cannot INDEPENDENTLY validate their own value — that is what owner_confirmed is for';
    END IF;
  END IF;

  UPDATE public.strata_benefit_values
     SET validation_status = p_verdict, validated_by = auth.uid(), validated_at = now(),
         validation_note = p_note, updated_at = now()
   WHERE id = p_value;

  -- D-4: the benefit's lifecycle advances on INDEPENDENT validation only, and the stage no longer
  -- names a department that was never involved.
  IF p_verdict = 'independently_validated' AND v.value_kind = 'realized' THEN
    UPDATE public.strata_benefits
       SET lifecycle_stage = 'independently_validated', updated_at = now()
     WHERE id = v.benefit_id AND lifecycle_stage IN ('in_flight','realized','forecast_revised');
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', p_value, 'RPC:validate_benefit_value', auth.uid(), p_verdict || COALESCE(': ' || p_note, ''));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_validate_benefit_value(uuid, text, text) TO authenticated;
