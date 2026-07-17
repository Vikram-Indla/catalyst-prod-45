-- CAT-STRATA-IMPL-20260712-001 · R4c · quarantine resolution workflow (D-5, E-6)
-- Reuses what shipped: `quarantined` + `accepted_with_exception` states and the exception columns
-- (reason / authorized_by / authorized_at / original_validation_failures) with DB-enforced
-- no-self-authorization all exist. strata_attest_actual already handles quarantine ENTRY with SoD.
-- Only the RESOLUTION verb was missing. Nothing here is rebuilt.
--
-- D-5: accepted-with-exception MAY count after Strategy Office authorization. Quarantined stays
-- excluded. Submitter cannot authorize their own exception. Preserve exception reason, original
-- validation failures, authorizer, timestamp, evidence, source run.
--
-- Why `correct` returns the row to `pending` rather than straight to validated: a corrected value is
-- a NEW claim and has not been checked by anyone. Sending it to validated would let the corrector
-- self-validate through the back door — the exact SoD that strata_attest_actual enforces at the
-- front. It re-enters the normal attestation path.
-- Note `pending` no longer counts (E-7 cond.3, migration 20260717170000), so a corrected value is
-- Missing until attested. That is correct: nobody has checked it yet.

CREATE OR REPLACE FUNCTION public.strata_resolve_quarantine(
  p_actual          uuid,
  p_verdict         text,
  p_reason          text,
  p_corrected_value numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE a record; v_failures jsonb;
BEGIN
  IF p_verdict NOT IN ('accept_with_exception','correct','reject') THEN
    RAISE EXCEPTION 'verdict must be accept_with_exception | correct | reject';
  END IF;
  -- D-5: Strategy Office authorizes exceptions. Correction/rejection are also SO acts here because
  -- the row is already quarantined — it failed validation, so the ordinary validator path is spent.
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'resolving a quarantined actual requires the strategy_office or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a reason is required to resolve a quarantined actual — the resolution must be explainable later';
  END IF;

  SELECT * INTO a FROM public.strata_kpi_actuals WHERE id = p_actual;
  IF a.id IS NULL THEN RAISE EXCEPTION 'actual not found'; END IF;
  IF a.validation_status <> 'quarantined' THEN
    RAISE EXCEPTION 'this actual is % — only a quarantined actual is resolved here', a.validation_status;
  END IF;

  -- E-6: preserve the ORIGINAL failures. Captured from what is on the row before it is resolved, so
  -- the record of why it was quarantined survives the resolution that clears it.
  v_failures := COALESCE(a.original_validation_failures,
                         jsonb_build_object(
                           'quarantined_note', a.validation_note,
                           'quarantined_by', a.validated_by,
                           'quarantined_at', a.validated_at,
                           'value_at_quarantine', a.value,
                           'upload_run_id', a.upload_run_id));

  IF p_verdict = 'accept_with_exception' THEN
    -- D-5/E-6: submitter cannot authorize their own exception. The DB CHECK enforces it too; this
    -- raises the readable error before the constraint does.
    IF a.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'segregation of duties: the submitter cannot authorize an exception for their own value';
    END IF;
    UPDATE public.strata_kpi_actuals
       SET validation_status = 'accepted_with_exception',
           exception_reason = p_reason,
           exception_authorized_by = auth.uid(),
           exception_authorized_at = now(),
           original_validation_failures = v_failures,
           updated_at = now()
     WHERE id = p_actual;

  ELSIF p_verdict = 'correct' THEN
    IF p_corrected_value IS NULL THEN
      RAISE EXCEPTION 'a corrected value is required to correct a quarantined actual';
    END IF;
    -- Back to pending: a corrected value is a NEW claim nobody has checked. It re-enters the normal
    -- attestation path rather than being trusted because the corrector says so.
    UPDATE public.strata_kpi_actuals
       SET value = p_corrected_value,
           validation_status = 'pending',
           validated_by = NULL, validated_at = NULL,
           validation_note = p_reason,
           original_validation_failures = v_failures,
           -- a corrected row is not an exception; clear any exception claim so it cannot linger
           exception_reason = NULL, exception_authorized_by = NULL, exception_authorized_at = NULL,
           updated_at = now()
     WHERE id = p_actual;

  ELSE  -- reject
    UPDATE public.strata_kpi_actuals
       SET validation_status = 'rejected',
           validation_note = p_reason,
           original_validation_failures = v_failures,
           updated_at = now()
     WHERE id = p_actual;
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note, before, after)
  VALUES ('strata_kpi_actuals', p_actual, 'RPC:resolve_quarantine', auth.uid(),
          format('quarantined → %s: %s', p_verdict, p_reason),
          jsonb_build_object('validation_status', a.validation_status, 'value', a.value),
          (SELECT jsonb_build_object('validation_status', x.validation_status, 'value', x.value,
                                     'exception_authorized_by', x.exception_authorized_by)
             FROM public.strata_kpi_actuals x WHERE x.id = p_actual));

  RETURN (SELECT jsonb_build_object('actual_id', x.id, 'validation_status', x.validation_status,
                                    'counts_in_official_calculations',
                                    x.validation_status IN ('validated','accepted_with_exception'),
                                    'exception_reason', x.exception_reason,
                                    'exception_authorized_by', x.exception_authorized_by,
                                    'original_validation_failures', x.original_validation_failures)
            FROM public.strata_kpi_actuals x WHERE x.id = p_actual);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_resolve_quarantine(uuid, text, text, numeric) TO authenticated;
