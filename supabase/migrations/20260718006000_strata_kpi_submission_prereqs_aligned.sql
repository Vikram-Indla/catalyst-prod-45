-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-001 completion (governance policy aligned)
--
-- Supersedes the gate shipped in 20260718005000 (which mirrored strata_approve_kpi only). The
-- established STRATA KPI governance policy requires MORE than approve was checking, so this
-- migration widens the prerequisite set AND makes approval read the same list — the two can no
-- longer drift, which is the root of KO-DEF-001.
--
-- Prerequisites now enforced (all applicable ones, reported together, never one at a time):
--   accountable owner · data owner · reporter · validator
--   validator <> accountable owner (SoD)
--   validator <> the person submitting (SoD; submit step only)
--   escalation owner WHEN the governed KPI-type definition demands it
--     (strata_kpi_type_configs.mandatory_metadata ? 'escalation_owner' — data-driven, not invented:
--      that jsonb array is the existing "governed definition" hook)
--   governed data source when entry_method='upload'
--   approved formula version when entry_method<>'manual'
--   at least one approved target
--   governed strategy association when is_strategic
--
-- Signature change: (uuid) -> (uuid, uuid DEFAULT auth.uid()). The 1-arg overload from
-- 20260718005000 MUST be dropped: CREATE OR REPLACE would leave both, and
-- strata_submit_record's 1-arg call binds to the exact-arity match — silently bypassing the new
-- gates. (Caught by probe; the DROP below is load-bearing, not tidiness.)
--
-- strata_submit_record is unchanged from 20260718005000: its existing 1-arg call now resolves to
-- this function with p_submitter defaulting to auth.uid(), which is exactly the submitter SoD
-- semantics required. Non-KPI governed tables remain untouched (branch is p_table='strata_kpis').
--
-- strata_approve_kpi is rewritten to delegate to the same function with p_submitter=NULL: the
-- validator<>submitter rule belongs to the submit step, and the approver's own SoD is already
-- enforced by strata_approve_record (a creator cannot approve their own record).
--
-- Historical safety: no UPDATE/DELETE of any existing row. Already-approved KPIs are never
-- re-validated by this change; calculations, snapshots and audit history are untouched. The
-- stricter policy applies only to future submit/approve transitions.

DROP FUNCTION IF EXISTS public.strata_kpi_submission_blockers(uuid);

CREATE OR REPLACE FUNCTION public.strata_kpi_submission_blockers(
  p_kpi uuid,
  p_submitter uuid DEFAULT auth.uid()
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k record; v text[] := '{}'::text[]; formula_ok int; target_ok int; tc record;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;

  -- Ownership (governed roles)
  IF k.accountable_owner_id IS NULL THEN v := array_append(v, 'Assign an accountable owner'); END IF;
  IF k.data_owner_id IS NULL THEN v := array_append(v, 'Assign a data owner'); END IF;
  IF k.reporter_id IS NULL THEN v := array_append(v, 'Assign a reporter'); END IF;
  IF k.validator_id IS NULL THEN v := array_append(v, 'Assign a validator'); END IF;

  -- Segregation of duties
  IF k.validator_id IS NOT NULL AND k.validator_id = k.accountable_owner_id THEN
    v := array_append(v, 'Validator must differ from the accountable owner (segregation of duties)');
  END IF;
  IF p_submitter IS NOT NULL AND k.validator_id IS NOT NULL AND k.validator_id = p_submitter THEN
    v := array_append(v, 'Validator must differ from the person submitting for approval (segregation of duties)');
  END IF;

  -- Escalation owner only when the governed KPI-type definition demands it.
  IF k.kpi_type_id IS NOT NULL AND k.escalation_owner_id IS NULL THEN
    SELECT name, mandatory_metadata INTO tc FROM public.strata_kpi_type_configs WHERE id = k.kpi_type_id;
    IF tc.mandatory_metadata IS NOT NULL AND tc.mandatory_metadata ? 'escalation_owner' THEN
      v := array_append(v, format('Assign an escalation owner (required by the %s KPI type)', tc.name));
    END IF;
  END IF;

  -- Source / formula / target
  IF k.entry_method = 'upload' AND k.data_source_id IS NULL THEN
    v := array_append(v, 'Register a governed data source (required for upload-fed KPIs)');
  END IF;
  SELECT count(*) INTO formula_ok FROM public.strata_kpi_formula_versions
   WHERE kpi_id = p_kpi AND status = 'approved';
  IF formula_ok = 0 AND k.entry_method <> 'manual' THEN
    v := array_append(v, 'Approve a formula version');
  END IF;
  SELECT count(*) INTO target_ok FROM public.strata_kpi_targets
   WHERE kpi_id = p_kpi AND status = 'approved';
  IF target_ok = 0 THEN v := array_append(v, 'Approve at least one target'); END IF;

  -- Governed strategy association (strategic KPIs only)
  IF k.is_strategic AND NOT EXISTS (SELECT 1 FROM public.strata_element_kpis WHERE kpi_id = p_kpi) THEN
    v := array_append(v, 'Link this Strategic KPI to at least one strategy element (cycle / theme / objective / perspective)');
  END IF;

  RETURN v;
END;
$function$;

COMMENT ON FUNCTION public.strata_kpi_submission_blockers(uuid, uuid) IS
  'Unmet governed prerequisites for a KPI; empty when approvable (KO-DEF-001). SINGLE source of truth: read by strata_submit_record (p_submitter = auth.uid(), adds validator<>submitter SoD), by strata_approve_kpi (p_submitter NULL), and by the UI — so the list shown is the list enforced and submit/approve cannot drift.';

GRANT EXECUTE ON FUNCTION public.strata_kpi_submission_blockers(uuid, uuid) TO authenticated;

-- Approval now delegates to the same gate list rather than re-implementing it.
CREATE OR REPLACE FUNCTION public.strata_approve_kpi(p_kpi uuid, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_blockers text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;
  v_blockers := public.strata_kpi_submission_blockers(p_kpi, NULL);
  IF array_length(v_blockers, 1) > 0 THEN
    RAISE EXCEPTION 'approval blocked — % prerequisite(s) not met: %',
      array_length(v_blockers, 1), array_to_string(v_blockers, '; ');
  END IF;
  PERFORM public.strata_approve_record('strata_kpis', p_kpi, p_note);
END;
$function$;
