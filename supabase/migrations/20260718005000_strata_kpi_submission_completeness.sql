-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-001 (P1)
--
-- Confirmed reproduction: `J KPI Full Pass 20260717-1707` moved Draft -> Pending Approval with
-- NO strategy association, owners, source, formula or target. Approval later failed on the
-- accountable owner ALONE — the first unmet gate — hiding the other five.
--
-- Root cause: strata_submit_record (latest def 20260710150000_strata_notifications_engine.sql:191)
-- is generic over all governed tables and checks only status='draft' + creator/admin. Every
-- prerequisite lives in strata_approve_kpi (20260712170000:160-189) and is evaluated far too
-- late — and one at a time, because each is its own RAISE.
--
-- Fix, in two parts:
--   1. strata_kpi_submission_blockers(uuid) -> text[] — ONE definition of "what is still
--      missing", returning the COMPLETE list. The submit gate and the UI both read it, so the
--      list the user sees is by construction the list the server enforces.
--   2. strata_submit_record gains a KPI-only pre-flight, evaluated in the SAME transaction as
--      the status change (atomic: refuse and the row stays draft).
--
-- Scope discipline — the gate mirrors strata_approve_kpi's gates EXACTLY:
--   accountable owner · validator · validator≠accountable (SoD) · data source when
--   entry_method='upload' · approved formula when entry_method<>'manual' · >=1 approved target ·
--   strategy-element link when is_strategic.
-- So "pending approval" now means "approvable", which is precisely what the defect broke.
-- NOTE for the ruling: the brief also lists DATA and REPORTING ownership. strata_approve_kpi
-- does NOT require data_owner_id or reporter_id, so requiring them at submit would make submit
-- STRICTER than approval and invent governance policy this migration has no mandate for. They
-- are deliberately NOT gated here; if they should be mandatory, add them to approve first and
-- this function inherits them.
--
-- Every other governed table is untouched: the branch is entered only when p_table='strata_kpis'
-- (a table-agnostic check would break strata_perspectives, strata_threshold_schemes,
-- strata_value_categories, strata_gate_models, strata_kpi_type_configs, strata_upload_templates,
-- strata_workflow_configs and strata_scorecard_models, none of which have these columns).
--
-- No UPDATE/DELETE of existing rows. Approved definitions, audit history and locked snapshots
-- are untouched — this only refuses a future invalid transition.

CREATE OR REPLACE FUNCTION public.strata_kpi_submission_blockers(p_kpi uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k record; v text[] := '{}'::text[]; formula_ok int; target_ok int;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;

  IF k.accountable_owner_id IS NULL THEN v := array_append(v, 'Assign an accountable owner'); END IF;
  IF k.validator_id IS NULL THEN v := array_append(v, 'Assign a validator'); END IF;
  IF k.validator_id IS NOT NULL AND k.validator_id = k.accountable_owner_id THEN
    v := array_append(v, 'Validator must differ from the accountable owner (segregation of duties)');
  END IF;
  IF k.entry_method = 'upload' AND k.data_source_id IS NULL THEN
    v := array_append(v, 'Register a data source (required for upload-fed KPIs)');
  END IF;

  SELECT count(*) INTO formula_ok FROM public.strata_kpi_formula_versions
   WHERE kpi_id = p_kpi AND status = 'approved';
  IF formula_ok = 0 AND k.entry_method <> 'manual' THEN
    v := array_append(v, 'Approve a formula version');
  END IF;

  SELECT count(*) INTO target_ok FROM public.strata_kpi_targets
   WHERE kpi_id = p_kpi AND status = 'approved';
  IF target_ok = 0 THEN v := array_append(v, 'Approve at least one target'); END IF;

  IF k.is_strategic AND NOT EXISTS (SELECT 1 FROM public.strata_element_kpis WHERE kpi_id = p_kpi) THEN
    v := array_append(v, 'Link this Strategic KPI to at least one strategy element (cycle / theme / objective / perspective)');
  END IF;

  RETURN v;
END;
$function$;

COMMENT ON FUNCTION public.strata_kpi_submission_blockers(uuid) IS
  'Unmet approval prerequisites for a KPI, empty when ready (KO-DEF-001). Mirrors strata_approve_kpi''s gates exactly so "pending approval" means "approvable". Read by the submit gate AND the UI — one definition, so the list shown is the list enforced.';

GRANT EXECUTE ON FUNCTION public.strata_kpi_submission_blockers(uuid) TO authenticated;

-- Body copied verbatim from 20260710150000_strata_notifications_engine.sql:191-216, plus the
-- KPI-only pre-flight. Signature unchanged -> CREATE OR REPLACE, no DROP, no PGRST ambiguity.
CREATE OR REPLACE FUNCTION public.strata_submit_record(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE cur_status text; cur_creator uuid; v_blockers text[];
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_submit_record: % is not a governed table', p_table;
  END IF;
  EXECUTE format('SELECT status, created_by FROM public.%I WHERE id = $1', p_table)
    INTO cur_status, cur_creator USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'draft' THEN RAISE EXCEPTION 'only draft records can be submitted (current: %)', cur_status; END IF;
  IF cur_creator IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the creator (or an admin) may submit a draft';
  END IF;

  -- KO-DEF-001: refuse the transition unless every applicable prerequisite is met, and report
  -- them ALL at once rather than one failed approval at a time.
  IF p_table = 'strata_kpis' THEN
    v_blockers := public.strata_kpi_submission_blockers(p_id);
    IF array_length(v_blockers, 1) > 0 THEN
      RAISE EXCEPTION 'submission blocked — % prerequisite(s) not met: %',
        array_length(v_blockers, 1), array_to_string(v_blockers, '; ');
    END IF;
  END IF;

  EXECUTE format('UPDATE public.%I SET status = ''pending_approval'', updated_at = now() WHERE id = $1', p_table) USING p_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:submit_record', auth.uid(), 'draft → pending_approval');
  PERFORM public.strata_notify(
    ra.user_id, 'config_pending_approval', p_table, p_id,
    'Config change awaiting approval',
    format('A %s record is pending approval.', replace(p_table, 'strata_', '')))
  FROM public.strata_role_assignments ra
  WHERE ra.role = 'strategy_office' AND ra.user_id <> auth.uid();
END;
$function$;
