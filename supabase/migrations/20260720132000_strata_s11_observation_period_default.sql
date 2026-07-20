-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S11 — observation period default (E2E fix)
-- Forward-only. Staging authenticated E2E revealed that an assignment observation logged
-- without an explicit period never resolves when the KR bridge queries by the assignment's
-- period (STRATA-KPI-019 period-scoped resolution) — assignment-backed KRs would silently
-- show no data. Fix: an observation with no explicit period inherits the assignment's
-- start_period_id, so period-scoped resolution finds it. Supersedes the S2 definition
-- (S2 is already applied; not edited).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_submit_assignment_observation(
  p_assignment uuid, p_as_of date, p_value numeric, p_period uuid DEFAULT NULL,
  p_numerator numeric DEFAULT NULL, p_denominator numeric DEFAULT NULL,
  p_source_channel text DEFAULT 'manual', p_evidence_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; v_id uuid; v_period uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner','data_steward']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'INVALID_TRANSITION: observations require an approved assignment (current: %)', a.status; END IF;
  IF p_source_channel NOT IN ('manual','upload','integration') THEN RAISE EXCEPTION 'INVALID_CHANNEL: %', p_source_channel; END IF;
  -- STRATA-KPI-019/026: default the observation period to the assignment's period so
  -- period-scoped resolution (used by the KR bridge) matches it.
  v_period := COALESCE(p_period, a.start_period_id);
  INSERT INTO public.strata_kpi_assignment_observations
    (assignment_id, period_id, as_of_date, value, numerator, denominator, source_channel, status)
  VALUES (p_assignment, v_period, p_as_of, p_value, p_numerator, p_denominator, p_source_channel, 'pending')
  ON CONFLICT (assignment_id, period_id, as_of_date) DO UPDATE
    SET value=EXCLUDED.value, numerator=EXCLUDED.numerator, denominator=EXCLUDED.denominator,
        source_channel=EXCLUDED.source_channel, status='pending', submitted_by=auth.uid(), submitted_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_assignment_observation(uuid,date,numeric,uuid,numeric,numeric,text,text) TO authenticated;
