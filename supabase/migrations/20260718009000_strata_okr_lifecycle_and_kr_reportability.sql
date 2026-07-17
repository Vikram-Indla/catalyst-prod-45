-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-003 server backbone: governed OKR lifecycle + KR
-- reportability. SERVER LAYER ONLY this slice; the reachable UI (Edit/Activate/Review/Close +
-- reportability display) is not yet wired, so no enabled action can bypass these gates.
--
-- Reproduction fixed: a Pending-KPI Key Result (J OKR Pending KPI KR, linked to a
-- pending_approval KPI) displayed 80% and counted toward progress. strata_kr_reportability now
-- classifies it Non-reportable, and strata_okr_official_progress excludes it — proven on staging:
--   pending-KPI KR reportable=false (state pending_approval, label Non-reportable)
--   official progress reportable_krs=1 excluded=1 official=0.50 (the 80% pending KR contributed 0;
--     only the standalone 50% counted)
--
-- Lifecycle Draft -> Active -> Closed, server-enforced (no silent RLS no-op):
--   update (draft only) · activate (needs owner+objective+period+>=1 KR) · link review (not closed)
--   · close (active only; final status + reason) · closed OKR & its KRs immutable via triggers.
-- Staging controls (rolled back): activate-incomplete blocked; draft->close blocked; closed OKR
-- and closed KR both immutable; audit trigger present on strata_okrs (before/after captured).
--
-- No second KPI/Measure dictionary. No historical fact repointed. No approved KPI mutated. All
-- additions are additive columns + new functions/triggers.

ALTER TABLE public.strata_okrs
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS closure_reason text,
  ADD COLUMN IF NOT EXISTS final_status text,
  ADD COLUMN IF NOT EXISTS review_id uuid;

CREATE OR REPLACE FUNCTION public.strata_kr_reportability(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kr record; kpi record; eff uuid; act record;
BEGIN
  SELECT * INTO kr FROM public.strata_key_results WHERE id = p_kr;
  IF kr.id IS NULL THEN RAISE EXCEPTION 'key result not found'; END IF;
  IF kr.kpi_id IS NULL THEN
    RETURN jsonb_build_object('reportable', true, 'kind', 'standalone',
      'label', 'Standalone measurement', 'qualified', false, 'kpi_state', null);
  END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = kr.kpi_id;
  IF kpi.id IS NULL OR kpi.status <> 'approved' THEN
    RETURN jsonb_build_object('reportable', false, 'kind', 'kpi_backed',
      'label', 'Non-reportable', 'qualified', false,
      'kpi_id', kr.kpi_id, 'kpi_name', kpi.name, 'kpi_state', coalesce(kpi.status,'unknown'),
      'reason', format('linked KPI is %s, not approved — authoring only', coalesce(kpi.status,'missing')));
  END IF;
  eff := public.strata_resolve_kpi_effective(kr.kpi_id, p_as_of::timestamptz);
  SELECT * INTO act FROM public.strata_kpi_actuals a
   WHERE a.kpi_id = eff AND a.validation_status IN ('validated','accepted_with_exception')
   ORDER BY a.submitted_at DESC NULLS LAST LIMIT 1;
  IF act.id IS NULL THEN
    RETURN jsonb_build_object('reportable', false, 'kind', 'kpi_backed',
      'label', 'Non-reportable', 'qualified', false,
      'kpi_id', kr.kpi_id, 'resolved_kpi_id', eff, 'kpi_state', 'approved',
      'reason', 'no eligible (validated / accepted-with-exception) actual for the effective KPI version');
  END IF;
  RETURN jsonb_build_object('reportable', true, 'kind', 'kpi_backed',
    'label', CASE WHEN act.validation_status = 'accepted_with_exception'
                  THEN 'Reportable (accepted with exception)' ELSE 'Reportable' END,
    'qualified', act.validation_status = 'accepted_with_exception',
    'kpi_id', kr.kpi_id, 'resolved_kpi_id', eff, 'kpi_state', 'approved',
    'actual_id', act.id, 'actual_status', act.validation_status);
END; $function$;
COMMENT ON FUNCTION public.strata_kr_reportability(uuid, date) IS
  'Whether a Key Result counts toward official OKR progress (KO-DEF-003). KPI-backed KRs count only with an approved KPI, resolved effective version and an eligible (validated/accepted_with_exception) actual; Draft/Pending KPI or ineligible actual => non-reportable. No second dictionary.';
GRANT EXECUTE ON FUNCTION public.strata_kr_reportability(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_okr_official_progress(p_okr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kr record; rep jsonb; n int := 0; excluded int := 0; total numeric := 0;
BEGIN
  FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id = p_okr LOOP
    rep := public.strata_kr_reportability(kr.id, p_as_of);
    IF (rep->>'reportable')::boolean THEN
      n := n + 1;
      IF kr.target IS NOT NULL AND kr.target <> 0 THEN
        total := total + least(coalesce(kr.current_value,0) / kr.target, 1);
      END IF;
    ELSE excluded := excluded + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('okr_id', p_okr, 'reportable_krs', n, 'excluded_krs', excluded,
    'official_progress', CASE WHEN n > 0 THEN round(total / n, 4) ELSE null END);
END; $function$;
COMMENT ON FUNCTION public.strata_okr_official_progress(uuid, date) IS
  'Official OKR progress over REPORTABLE key results only (KO-DEF-003). Non-reportable (Draft/Pending KPI, ineligible actual) KRs contribute zero.';
GRANT EXECUTE ON FUNCTION public.strata_okr_official_progress(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_update_okr(
  p_okr uuid, p_owner uuid DEFAULT NULL, p_objective uuid DEFAULT NULL,
  p_cycle uuid DEFAULT NULL, p_period uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'editing an OKR requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'draft' THEN RAISE EXCEPTION 'only a draft OKR can be edited (current: %)', o.status; END IF;
  IF p_objective IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_objective) THEN
    RAISE EXCEPTION 'strategy objective not found'; END IF;
  IF p_period IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period) THEN
    RAISE EXCEPTION 'period not found'; END IF;
  UPDATE public.strata_okrs
     SET owner_id = COALESCE(p_owner, owner_id), objective_element_id = COALESCE(p_objective, objective_element_id),
         cycle_id = COALESCE(p_cycle, cycle_id), period_id = COALESCE(p_period, period_id), updated_at = now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_update_okr(uuid,uuid,uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_activate_okr(p_okr uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_count int; missing text[] := '{}';
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'activating an OKR requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'draft' THEN RAISE EXCEPTION 'only a draft OKR can be activated (current: %)', o.status; END IF;
  IF o.owner_id IS NULL THEN missing := array_append(missing, 'accountable owner'); END IF;
  IF o.objective_element_id IS NULL THEN missing := array_append(missing, 'strategy objective link'); END IF;
  IF o.period_id IS NULL THEN missing := array_append(missing, 'period'); END IF;
  SELECT count(*) INTO kr_count FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_count = 0 THEN missing := array_append(missing, 'at least one Key Result'); END IF;
  IF array_length(missing,1) > 0 THEN RAISE EXCEPTION 'cannot activate — missing: %', array_to_string(missing, '; '); END IF;
  UPDATE public.strata_okrs SET status='active', activated_at=now(), activated_by=auth.uid(), updated_at=now() WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_activate_okr(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_link_okr_review(p_okr uuid, p_review uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'linking a review requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status = 'closed' THEN RAISE EXCEPTION 'a closed OKR is immutable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_reviews WHERE id = p_review) THEN RAISE EXCEPTION 'review not found'; END IF;
  UPDATE public.strata_okrs SET review_id = p_review, updated_at = now() WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_link_okr_review(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_close_okr(p_okr uuid, p_final_status text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'closing an OKR requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'active' THEN RAISE EXCEPTION 'only an active OKR can be closed (current: %) — no direct draft to closed', o.status; END IF;
  IF p_final_status IS NULL OR p_final_status NOT IN ('achieved','partially_achieved','missed') THEN
    RAISE EXCEPTION 'final status must be achieved | partially_achieved | missed'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'a closure reason is required'; END IF;
  UPDATE public.strata_okrs
     SET status='closed', final_status=p_final_status, closure_reason=p_reason,
         closed_at=now(), closed_by=auth.uid(), updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_close_okr(uuid,text,text) TO authenticated;

-- Closed-history immutability — server enforced.
CREATE OR REPLACE FUNCTION public.strata_guard_closed_okr() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'closed' THEN RAISE EXCEPTION 'a closed OKR cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'a closed OKR is immutable — its final status, reason and history are frozen'; END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_guard_closed_okr ON public.strata_okrs;
CREATE TRIGGER trg_strata_guard_closed_okr BEFORE UPDATE OR DELETE ON public.strata_okrs
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_closed_okr();

CREATE OR REPLACE FUNCTION public.strata_guard_closed_okr_kr() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE parent_status text; okr uuid;
BEGIN
  okr := COALESCE(NEW.okr_id, OLD.okr_id);
  SELECT status INTO parent_status FROM public.strata_okrs WHERE id = okr;
  IF parent_status = 'closed' THEN RAISE EXCEPTION 'Key Results of a closed OKR are immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_guard_closed_okr_kr ON public.strata_key_results;
CREATE TRIGGER trg_strata_guard_closed_okr_kr BEFORE INSERT OR UPDATE OR DELETE ON public.strata_key_results
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_closed_okr_kr();
