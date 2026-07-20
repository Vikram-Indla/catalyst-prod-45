-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S2 — first-class KPI Assignment entity
-- Forward-only, additive. Introduces a governed, scoped assignment of an approved
-- KPI Definition, with its OWN target (not a free-text note) and its OWN scoped
-- observations (keyed by assignment+period), so one KPI Definition can be reused
-- across enterprise / department / multiple projects without colliding actuals.
--
-- Closes gaps:
--   STRATA-KPI-025 — strata_kpi_assignments: kpi + scope + owner + target + period + class + status.
--   STRATA-KPI-026 — strata_kpi_assignment_observations keyed by (assignment, period, as_of).
--   STRATA-KPI-027 — real numeric target columns on the assignment (never overwrites the
--                    enterprise strata_kpi_targets; never a free-text note).
-- Legacy strata_execution_links 'measures' edges are preserved untouched (compat read).
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Assignment table (governed envelope + scope + own target)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kpi_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_key text UNIQUE,
  kpi_id uuid NOT NULL REFERENCES public.strata_kpis(id) ON DELETE RESTRICT,
  -- scope: strategic (a strategy element / org unit) OR project (card + project objective)
  scope_type text NOT NULL CHECK (scope_type IN ('strategic','project')),
  element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT,
  org_unit_id uuid,
  project_card_id uuid,
  project_objective_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT,
  -- ownership
  owner_id uuid,
  accountable_owner_id uuid,
  -- the assignment's OWN target (STRATA-KPI-027) — separate from enterprise strata_kpi_targets
  target numeric,
  target_band_min numeric,
  target_band_max numeric,
  direction text CHECK (direction IS NULL OR direction IN ('higher_better','lower_better','band','manual')),
  start_period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  end_period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  -- KR-eligibility of THIS assignment (only when the KPI definition is kr_eligible)
  kr_eligible boolean NOT NULL DEFAULT false,
  -- governance envelope
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','retired','superseded')),
  submitted_by uuid, submitted_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  rejected_by uuid, rejected_at timestamptz, rejection_reason text,
  retired_by uuid, retired_at timestamptz,
  effective_from timestamptz, effective_to timestamptz,
  supersedes_id uuid REFERENCES public.strata_kpi_assignments(id) ON DELETE SET NULL,
  lock_version int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- scope integrity: a project assignment needs a card + project objective; a strategic one an element
  CONSTRAINT strata_kpi_assignment_scope_ck CHECK (
    (scope_type = 'strategic' AND element_id IS NOT NULL AND project_card_id IS NULL)
    OR (scope_type = 'project' AND project_card_id IS NOT NULL AND project_objective_id IS NOT NULL)
  )
);
COMMENT ON TABLE public.strata_kpi_assignments IS
  'Governed scoped use of an approved KPI Definition (STRATA-KPI-025). Has its own owner/target/period/observations. Enterprise strata_kpi_targets are never overwritten by this path.';
CREATE INDEX IF NOT EXISTS idx_strata_kpi_assignments_kpi ON public.strata_kpi_assignments(kpi_id);
CREATE INDEX IF NOT EXISTS idx_strata_kpi_assignments_card ON public.strata_kpi_assignments(project_card_id);
CREATE INDEX IF NOT EXISTS idx_strata_kpi_assignments_element ON public.strata_kpi_assignments(element_id);

ALTER TABLE public.strata_kpi_assignments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_assignments' AND policyname='strata_kpi_assignments_read') THEN
    CREATE POLICY strata_kpi_assignments_read ON public.strata_kpi_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_assignments' AND policyname='strata_kpi_assignments_write') THEN
    CREATE POLICY strata_kpi_assignments_write ON public.strata_kpi_assignments FOR ALL TO authenticated
      USING (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']))
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_strata_kpi_assignments_touch ON public.strata_kpi_assignments;
CREATE TRIGGER trg_strata_kpi_assignments_touch BEFORE UPDATE ON public.strata_kpi_assignments
  FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();

-- ===========================================================================
-- 2. Scoped observations (keyed by assignment + period + as_of) — STRATA-KPI-026
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kpi_assignment_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.strata_kpi_assignments(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  as_of_date date NOT NULL,
  value numeric,
  numerator numeric,
  denominator numeric,
  source_channel text NOT NULL DEFAULT 'manual' CHECK (source_channel IN ('manual','upload','integration')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected','accepted_with_exception')),
  exception_reason text,
  evidence_url text,
  submitted_by uuid DEFAULT auth.uid(), submitted_at timestamptz NOT NULL DEFAULT now(),
  validated_by uuid, validated_at timestamptz,
  reversed_by uuid, reversed_at timestamptz, reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (assignment_id, period_id, as_of_date)
);
COMMENT ON TABLE public.strata_kpi_assignment_observations IS
  'Scoped KPI actuals for an assignment (STRATA-KPI-026). Keyed by (assignment, period, as_of) so two projects reusing one KPI Definition never collide. Append-only history; validated/accepted_with_exception feed official resolution.';
CREATE INDEX IF NOT EXISTS idx_strata_kpi_assign_obs_assignment ON public.strata_kpi_assignment_observations(assignment_id, as_of_date DESC);

ALTER TABLE public.strata_kpi_assignment_observations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_assignment_observations' AND policyname='strata_kpi_assign_obs_read') THEN
    CREATE POLICY strata_kpi_assign_obs_read ON public.strata_kpi_assignment_observations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_assignment_observations' AND policyname='strata_kpi_assign_obs_write') THEN
    CREATE POLICY strata_kpi_assign_obs_write ON public.strata_kpi_assignment_observations FOR ALL TO authenticated
      USING (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner','data_steward']))
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner','data_steward']));
  END IF;
END $$;

-- ===========================================================================
-- 3. Assignment lifecycle RPCs (maker-checker SoD)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_create_kpi_assignment(
  p_kpi uuid, p_scope_type text,
  p_element uuid DEFAULT NULL, p_project_card uuid DEFAULT NULL, p_project_objective uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL, p_target numeric DEFAULT NULL, p_target_band_min numeric DEFAULT NULL,
  p_target_band_max numeric DEFAULT NULL, p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL,
  p_kr_eligible boolean DEFAULT false, p_org_unit uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kpi record; v_id uuid; v_key text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: creating a KPI assignment requires strategy_office/kpi_owner/okr_owner'; END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  -- STRATA-KPI-024: reuse requires an APPROVED registry definition; no project-local minting.
  IF kpi.status <> 'approved' THEN
    RAISE EXCEPTION 'INVALID_KPI: only an approved KPI Definition can be assigned (current: %)', kpi.status; END IF;
  IF p_scope_type NOT IN ('strategic','project') THEN RAISE EXCEPTION 'INVALID_SCOPE: scope must be strategic|project'; END IF;
  IF p_kr_eligible AND NOT kpi.kr_eligible THEN
    RAISE EXCEPTION 'INVALID_KR_ELIGIBLE: the KPI Definition is not KR-eligible (STRATA-KPI-005)'; END IF;
  INSERT INTO public.strata_kpi_assignments
    (kpi_id, scope_type, element_id, org_unit_id, project_card_id, project_objective_id,
     owner_id, target, target_band_min, target_band_max, direction, start_period_id, end_period_id,
     kr_eligible, status)
  VALUES
    (p_kpi, p_scope_type, p_element, p_org_unit, p_project_card, p_project_objective,
     p_owner, p_target, p_target_band_min, p_target_band_max, kpi.direction, p_start_period, p_end_period,
     p_kr_eligible, 'draft')
  RETURNING id INTO v_id;
  v_key := 'KA-' || upper(substr(replace(v_id::text,'-',''),1,10));
  UPDATE public.strata_kpi_assignments SET assignment_key = v_key WHERE id = v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_kpi_assignment(uuid,text,uuid,uuid,uuid,uuid,numeric,numeric,numeric,uuid,uuid,boolean,uuid) TO authenticated;

-- authoritative assignment validator (reused by submit/approve/migration)
CREATE OR REPLACE FUNCTION public.strata_kpi_assignment_validate(p_assignment uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; kpi record; codes text[] := '{}';
BEGIN
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['ASSIGNMENT_NOT_FOUND']); END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = a.kpi_id;
  IF kpi.status <> 'approved' THEN codes := array_append(codes,'KPI_NOT_APPROVED'); END IF;
  IF a.owner_id IS NULL THEN codes := array_append(codes,'MISSING_OWNER'); END IF;
  -- a real numeric target (STRATA-KPI-027): band scope needs a band, otherwise a point target
  IF a.direction IN ('band') OR (a.target_band_min IS NOT NULL OR a.target_band_max IS NOT NULL) THEN
    IF a.target_band_min IS NULL OR a.target_band_max IS NULL THEN codes := array_append(codes,'MISSING_TARGET_BAND'); END IF;
  ELSIF a.target IS NULL THEN codes := array_append(codes,'MISSING_TARGET');
  END IF;
  IF a.start_period_id IS NULL THEN codes := array_append(codes,'MISSING_PERIOD'); END IF;
  IF a.kr_eligible AND NOT kpi.kr_eligible THEN codes := array_append(codes,'KR_ELIGIBLE_MISMATCH'); END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'assignment_id', p_assignment);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_kpi_assignment_validate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_submit_kpi_assignment(p_assignment uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> a.lock_version THEN RAISE EXCEPTION 'STALE_WRITE: assignment changed since load'; END IF;
  IF a.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected assignment can be submitted (current: %)', a.status; END IF;
  v := public.strata_kpi_assignment_validate(p_assignment);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: %', (v->>'codes'); END IF;
  UPDATE public.strata_kpi_assignments
     SET status='submitted', submitted_by=auth.uid(), submitted_at=now(),
         rejected_by=NULL, rejected_at=NULL, rejection_reason=NULL, lock_version=lock_version+1
   WHERE id = p_assignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_kpi_assignment(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_approve_kpi_assignment(p_assignment uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: approving an assignment requires kpi_approver or strategy_office'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> a.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF a.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted assignment can be approved (current: %)', a.status; END IF;
  IF a.submitted_by IS NOT NULL AND a.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own assignment (maker-checker)'; END IF;
  v := public.strata_kpi_assignment_validate(p_assignment);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: %', (v->>'codes'); END IF;
  UPDATE public.strata_kpi_assignments
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(effective_from, now()), lock_version=lock_version+1
   WHERE id = p_assignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_kpi_assignment(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_reject_kpi_assignment(p_assignment uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_approver']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF coalesce(btrim(p_reason),'') = '' THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: a rejection reason is required'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF a.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted assignment can be rejected (current: %)', a.status; END IF;
  IF a.submitted_by IS NOT NULL AND a.submitted_by = auth.uid() THEN RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot decide their own assignment'; END IF;
  UPDATE public.strata_kpi_assignments
     SET status='rejected', rejected_by=auth.uid(), rejected_at=now(), rejection_reason=p_reason, lock_version=lock_version+1
   WHERE id = p_assignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_reject_kpi_assignment(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_retire_kpi_assignment(p_assignment uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF a.status = 'retired' THEN RAISE EXCEPTION 'INVALID_TRANSITION: assignment already retired'; END IF;
  UPDATE public.strata_kpi_assignments
     SET status='retired', retired_by=auth.uid(), retired_at=now(), effective_to=COALESCE(effective_to, now()), lock_version=lock_version+1
   WHERE id = p_assignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_retire_kpi_assignment(uuid,text) TO authenticated;

-- ===========================================================================
-- 4. Scoped observation channels (submit / validate / reverse) — SoD on validate
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_submit_assignment_observation(
  p_assignment uuid, p_as_of date, p_value numeric, p_period uuid DEFAULT NULL,
  p_numerator numeric DEFAULT NULL, p_denominator numeric DEFAULT NULL,
  p_source_channel text DEFAULT 'manual', p_evidence_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner','data_steward']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'INVALID_TRANSITION: observations require an approved assignment (current: %)', a.status; END IF;
  IF p_source_channel NOT IN ('manual','upload','integration') THEN RAISE EXCEPTION 'INVALID_CHANNEL: %', p_source_channel; END IF;
  INSERT INTO public.strata_kpi_assignment_observations
    (assignment_id, period_id, as_of_date, value, numerator, denominator, source_channel, status)
  VALUES (p_assignment, p_period, p_as_of, p_value, p_numerator, p_denominator, p_source_channel, 'pending')
  ON CONFLICT (assignment_id, period_id, as_of_date) DO UPDATE
    SET value=EXCLUDED.value, numerator=EXCLUDED.numerator, denominator=EXCLUDED.denominator,
        source_channel=EXCLUDED.source_channel, status='pending', submitted_by=auth.uid(), submitted_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_assignment_observation(uuid,date,numeric,uuid,numeric,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_validate_assignment_observation(
  p_observation uuid, p_decision text, p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','validator','kpi_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_decision NOT IN ('validated','rejected','accepted_with_exception') THEN RAISE EXCEPTION 'INVALID_DECISION: %', p_decision; END IF;
  SELECT * INTO o FROM public.strata_kpi_assignment_observations WHERE id = p_observation;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Observation not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a pending observation can be decided (current: %)', o.status; END IF;
  -- SoD: the submitter cannot validate their own observation
  IF o.submitted_by IS NOT NULL AND o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot validate their own observation'; END IF;
  IF p_decision = 'accepted_with_exception' AND coalesce(btrim(p_reason),'') = '' THEN
    RAISE EXCEPTION 'INVALID_DECISION: accepted_with_exception requires a reason'; END IF;
  UPDATE public.strata_kpi_assignment_observations
     SET status=p_decision, validated_by=auth.uid(), validated_at=now(),
         exception_reason=CASE WHEN p_decision='accepted_with_exception' THEN p_reason ELSE exception_reason END
   WHERE id = p_observation;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_validate_assignment_observation(uuid,text,text) TO authenticated;

-- Resolve the eligible observation for an assignment at a period/as_of (STRATA-KPI-019/026):
-- validated preferred, else accepted_with_exception; matched to the period when provided.
CREATE OR REPLACE FUNCTION public.strata_resolve_assignment_observation(p_assignment uuid, p_period uuid DEFAULT NULL, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM public.strata_kpi_assignment_observations
   WHERE assignment_id = p_assignment
     AND (p_period IS NULL OR period_id = p_period)
     AND as_of_date <= p_as_of
     AND status IN ('validated','accepted_with_exception')
   ORDER BY (status='validated') DESC, as_of_date DESC, submitted_at DESC
   LIMIT 1;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('resolved', false, 'reason', 'NO_ELIGIBLE_OBSERVATION');
  END IF;
  RETURN jsonb_build_object('resolved', true, 'observation_id', o.id, 'value', o.value,
    'numerator', o.numerator, 'denominator', o.denominator, 'status', o.status,
    'as_of', o.as_of_date, 'period_id', o.period_id,
    'exception', (o.status = 'accepted_with_exception'), 'exception_reason', o.exception_reason);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_resolve_assignment_observation(uuid,uuid,date) TO authenticated;
