-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-003 · complete the assurance workflow
--
-- strata_validate_benefit_value (20260717160000) covers owner_confirmed / independently_validated /
-- rejected and directs exceptions to "strata_authorize_benefit_exception" — a function that was
-- never created. This adds the two missing governed transitions, reusing the exception columns and
-- CHECK constraints already on strata_benefit_values (_exception_complete, _exception_no_self_auth):
--
--   accepted_with_exception : a DIFFERENT authorized actor (Strategy Office) accepts a value that
--                             would not otherwise count, with a visible reason + evidence. COUNTS
--                             per the governed eligibility rule; the exception stays visible.
--   reversed                 : append-only supersession — status flips to 'reversed', the value and
--                             all audit/lineage history are preserved (never erased); it stops
--                             counting. Reason is mandatory and audited.
--
-- Forward-only, idempotent (CREATE OR REPLACE). No constraint or column changes.

CREATE OR REPLACE FUNCTION public.strata_authorize_benefit_exception(
  p_value uuid, p_reason text, p_evidence text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record; b record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'accepting a benefit value with exception requires strategy_office (or admin)';
  END IF;
  SELECT * INTO v FROM public.strata_benefit_values WHERE id = p_value;
  IF v.id IS NULL THEN RAISE EXCEPTION 'benefit value not found'; END IF;
  -- D-5/E-6: the authorizer must differ from the submitter (also enforced by the DB constraint).
  IF v.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot authorize their own exception';
  END IF;
  IF v.validation_status IN ('rejected','reversed') THEN
    RAISE EXCEPTION 'a % value cannot be accepted with exception', v.validation_status;
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'accepting with exception requires a visible reason';
  END IF;
  IF p_evidence IS NULL OR btrim(p_evidence) = '' THEN
    RAISE EXCEPTION 'accepting with exception requires evidence';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = v.benefit_id;

  UPDATE public.strata_benefit_values
     SET validation_status = 'accepted_with_exception',
         exception_reason = btrim(p_reason),
         exception_authorized_by = auth.uid(),
         exception_authorized_at = now(),
         original_validation_failures = COALESCE(
           original_validation_failures,
           jsonb_build_object('prior_status', v.validation_status)) || jsonb_build_object('evidence', btrim(p_evidence)),
         validated_by = auth.uid(), validated_at = now(),
         updated_at = now()
   WHERE id = p_value;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', p_value, 'RPC:authorize_benefit_exception', auth.uid(),
          format('accepted %s value with exception: %s (evidence: %s)',
                 v.value_kind, btrim(p_reason), btrim(p_evidence)));
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_reverse_benefit_value(
  p_value uuid, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'reversing a benefit value requires strategy_office or vmo_validator (or admin)';
  END IF;
  SELECT * INTO v FROM public.strata_benefit_values WHERE id = p_value;
  IF v.id IS NULL THEN RAISE EXCEPTION 'benefit value not found'; END IF;
  IF v.validation_status = 'reversed' THEN
    RAISE EXCEPTION 'benefit value is already reversed';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reversal requires a reason';
  END IF;

  -- Append-only: the value and its history are preserved; only the assurance state changes so it
  -- stops counting. Prior status is captured in the audit note for lineage.
  UPDATE public.strata_benefit_values
     SET validation_status = 'reversed',
         validation_note = btrim(p_reason),
         updated_at = now()
   WHERE id = p_value;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', p_value, 'RPC:reverse_benefit_value', auth.uid(),
          format('reversed/superseded (was %s): %s', v.validation_status, btrim(p_reason)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.strata_authorize_benefit_exception(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_reverse_benefit_value(uuid, text) TO authenticated;
