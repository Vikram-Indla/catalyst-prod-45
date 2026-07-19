-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 3: independent Key Result measurement contract.
--
-- Additive + forward-only. Repurposes strata_key_results as the stable KR identity/head and
-- adds the full governed contract (invariant 4): stable ref/version, business definition,
-- baseline/target + dates, unit (governed UoM), direction (expanded), formula + num/denom/
-- components, inclusion/exclusion, observation frequency + due schedule, update method
-- (manual|upload|integration|composite), data source + freshness, and the role set
-- (accountable owner + owning org + reporter + data steward + escalation + contributors).
--
-- A KR is NOT a KPI: strata_add_kr never accepts a kpi_id — new KRs are independent contracts.
-- The legacy kpi_id column is preserved as historical provenance only (invariants 5, 18).
-- Target phasing lives in strata_kr_targets; versioned contract snapshots in strata_kr_versions.

-- ===========================================================================
-- 1. strata_key_results — contract columns
-- ===========================================================================
ALTER TABLE public.strata_key_results
  ADD COLUMN IF NOT EXISTS kr_ref text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS business_definition text,
  ADD COLUMN IF NOT EXISTS baseline_date date,
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.strata_units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scale text,
  ADD COLUMN IF NOT EXISTS range_min numeric,
  ADD COLUMN IF NOT EXISTS range_max numeric,
  ADD COLUMN IF NOT EXISTS formula_id uuid,
  ADD COLUMN IF NOT EXISTS formula_version int,
  ADD COLUMN IF NOT EXISTS numerator_def text,
  ADD COLUMN IF NOT EXISTS denominator_def text,
  ADD COLUMN IF NOT EXISTS component_def jsonb,
  ADD COLUMN IF NOT EXISTS inclusion_rules text,
  ADD COLUMN IF NOT EXISTS exclusion_rules text,
  ADD COLUMN IF NOT EXISTS observation_frequency text,
  ADD COLUMN IF NOT EXISTS due_schedule jsonb,
  ADD COLUMN IF NOT EXISTS update_method text,
  ADD COLUMN IF NOT EXISTS data_source_id uuid REFERENCES public.strata_data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS freshness_expectation text,
  ADD COLUMN IF NOT EXISTS accountable_owner_id uuid,
  ADD COLUMN IF NOT EXISTS owning_org_unit_id uuid REFERENCES public.strata_org_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reporter_id uuid,
  ADD COLUMN IF NOT EXISTS data_steward_id uuid,
  ADD COLUMN IF NOT EXISTS escalation_owner_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_policy text,
  ADD COLUMN IF NOT EXISTS commitment text,
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS status_thresholds jsonb,
  ADD COLUMN IF NOT EXISTS forecast_policy text,
  ADD COLUMN IF NOT EXISTS confidence_policy text,
  ADD COLUMN IF NOT EXISTS lifecycle text,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS lock_version int NOT NULL DEFAULT 0;

ALTER TABLE public.strata_key_results DROP CONSTRAINT IF EXISTS strata_key_results_direction_check;
ALTER TABLE public.strata_key_results ADD CONSTRAINT strata_key_results_direction_check CHECK (
  direction = ANY (ARRAY['higher_better','lower_better','band','within_range',
                         'maintain_above','maintain_below','exact_target','milestone','custom_curve']::text[])
);
ALTER TABLE public.strata_key_results DROP CONSTRAINT IF EXISTS strata_kr_update_method_check;
ALTER TABLE public.strata_key_results ADD CONSTRAINT strata_kr_update_method_check
  CHECK (update_method IS NULL OR update_method IN ('manual','upload','integration','composite'));
ALTER TABLE public.strata_key_results DROP CONSTRAINT IF EXISTS strata_kr_lifecycle_check;
ALTER TABLE public.strata_key_results ADD CONSTRAINT strata_kr_lifecycle_check
  CHECK (lifecycle IS NULL OR lifecycle IN ('draft','active','retired','superseded'));
ALTER TABLE public.strata_key_results DROP CONSTRAINT IF EXISTS strata_kr_commitment_check;
ALTER TABLE public.strata_key_results ADD CONSTRAINT strata_kr_commitment_check
  CHECK (commitment IS NULL OR commitment IN ('committed','aspirational'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_kr_ref ON public.strata_key_results(kr_ref) WHERE kr_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_kr_slug ON public.strata_key_results(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strata_kr_okr ON public.strata_key_results(okr_id);

-- Deterministic backfill of stable ref/slug/lifecycle for existing KRs (id-derived, unique).
-- id-derived, unique tail (12 hex; head-8 collides on the a5a1a000… seed prefix).
UPDATE public.strata_key_results
   SET kr_ref = COALESCE(kr_ref, 'KR-' || upper(substr(replace(id::text,'-',''),21,12))),
       slug   = COALESCE(slug,   'kr-' || lower(substr(replace(id::text,'-',''),21,12))),
       lifecycle = COALESCE(lifecycle, 'active')
 WHERE kr_ref IS NULL OR slug IS NULL OR lifecycle IS NULL;

COMMENT ON COLUMN public.strata_key_results.kpi_id IS
  'LEGACY PROVENANCE ONLY (CAT-STRATA-THEMEOKR-20260719-001). Prospective KRs are independent contracts and never use a KPI as identity (invariant 5). Retained so historical KPI-backed KRs stay readable/reproducible (invariant 18).';

-- ===========================================================================
-- 2. strata_kr_versions — versioned KR contract snapshot
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kr_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES public.strata_key_results(id) ON DELETE CASCADE,
  version int NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
  name text NOT NULL,
  business_definition text,
  baseline numeric, baseline_date date,
  target numeric, target_date date,
  unit_id uuid, direction text,
  range_min numeric, range_max numeric,
  formula_id uuid, formula_version int,
  numerator_def text, denominator_def text, component_def jsonb,
  inclusion_rules text, exclusion_rules text,
  observation_frequency text, due_schedule jsonb,
  update_method text, data_source_id uuid, freshness_expectation text,
  accountable_owner_id uuid, owning_org_unit_id uuid, reporter_id uuid,
  data_steward_id uuid, escalation_owner_id uuid,
  is_critical boolean NOT NULL DEFAULT false, weight numeric,
  status_thresholds jsonb, forecast_policy text, confidence_policy text,
  change_rationale text,
  supersedes_id uuid REFERENCES public.strata_kr_versions(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kr_id, version)
);
CREATE INDEX IF NOT EXISTS idx_strata_kr_versions_kr ON public.strata_kr_versions(kr_id, version DESC);

-- ===========================================================================
-- 3. strata_kr_contributors — many contributors (single-cardinality roles are KR columns)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kr_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES public.strata_key_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text,
  added_by uuid DEFAULT auth.uid(),
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kr_id, user_id)
);

-- ===========================================================================
-- 4. strata_kr_targets — target phasing / milestones
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kr_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES public.strata_key_results(id) ON DELETE CASCADE,
  kr_version_id uuid REFERENCES public.strata_kr_versions(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE CASCADE,
  phased_target numeric,
  milestone_label text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kr_id, period_id)
);
CREATE INDEX IF NOT EXISTS idx_strata_kr_targets_kr ON public.strata_kr_targets(kr_id);

-- Triggers + RLS for the three new tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_kr_versions','strata_kr_contributors','strata_kr_targets'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_'||t||'_audit') THEN
      EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner','kpi_owner']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner','kpi_owner']))$p$, t);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_kr_targets_touch') THEN
    CREATE TRIGGER trg_strata_kr_targets_touch BEFORE UPDATE ON public.strata_kr_targets
      FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();
  END IF;
END $$;

-- ===========================================================================
-- 5. Authoritative KR contract validator (reused by submit/activate/observation/migration)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_kr_validate_contract(p_kr uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; codes text[] := '{}'; is_milestone boolean;
BEGIN
  SELECT * INTO k FROM public.strata_key_results WHERE id = p_kr;
  IF k.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['KR_NOT_FOUND']); END IF;
  is_milestone := (k.direction = 'milestone');
  IF coalesce(btrim(k.name),'') = '' THEN codes := array_append(codes,'MISSING_TITLE'); END IF;
  IF coalesce(btrim(k.business_definition),'') = '' THEN codes := array_append(codes,'MISSING_DEFINITION'); END IF;
  IF k.accountable_owner_id IS NULL THEN codes := array_append(codes,'MISSING_ACCOUNTABLE_OWNER'); END IF;
  IF k.owning_org_unit_id IS NULL THEN codes := array_append(codes,'MISSING_OWNING_ORG'); END IF;
  IF k.update_method IS NULL THEN codes := array_append(codes,'MISSING_UPDATE_METHOD'); END IF;
  IF k.update_method IN ('upload','integration') AND k.data_source_id IS NULL THEN
    codes := array_append(codes,'MISSING_DATA_SOURCE'); END IF;
  IF k.observation_frequency IS NULL THEN codes := array_append(codes,'MISSING_FREQUENCY'); END IF;
  IF is_milestone THEN
    -- a milestone KR needs completion criteria + evidence policy, not baseline/target numerics
    IF k.component_def IS NULL AND coalesce(btrim(k.business_definition),'') = '' THEN
      codes := array_append(codes,'MILESTONE_NEEDS_CRITERIA'); END IF;
    IF coalesce(btrim(k.evidence_policy),'') = '' THEN codes := array_append(codes,'MILESTONE_NEEDS_EVIDENCE'); END IF;
  ELSE
    -- a measurable KR needs a valid numeric contract (invariant 4; no text-only official KR)
    IF k.unit_id IS NULL AND coalesce(btrim(k.unit),'') = '' THEN codes := array_append(codes,'MISSING_UNIT'); END IF;
    IF k.baseline IS NULL THEN codes := array_append(codes,'MISSING_BASELINE'); END IF;
    IF k.target IS NULL THEN codes := array_append(codes,'MISSING_TARGET'); END IF;
    IF k.direction IN ('within_range','band') AND (k.range_min IS NULL OR k.range_max IS NULL) THEN
      codes := array_append(codes,'MISSING_RANGE'); END IF;
    IF k.direction NOT IN ('within_range','band') AND k.baseline IS NOT NULL AND k.target IS NOT NULL
       AND k.baseline = k.target THEN codes := array_append(codes,'BASELINE_EQUALS_TARGET'); END IF;
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'kr_id', p_kr, 'milestone', is_milestone);
END; $function$;
COMMENT ON FUNCTION public.strata_kr_validate_contract(uuid) IS
  'Authoritative KR measurement-contract validator (CAT-STRATA-THEMEOKR-20260719-001, invariant 4). A text-only KR is invalid unless it is a deliberately modelled milestone with completion criteria + evidence.';
GRANT EXECUTE ON FUNCTION public.strata_kr_validate_contract(uuid) TO authenticated;

-- ===========================================================================
-- 6. KR authoring RPCs (independent contracts — never KPI-backed)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_add_kr(
  p_okr uuid, p_name text, p_business_definition text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL, p_baseline numeric DEFAULT NULL, p_baseline_date date DEFAULT NULL,
  p_target numeric DEFAULT NULL, p_target_date date DEFAULT NULL, p_direction text DEFAULT 'higher_better',
  p_update_method text DEFAULT 'manual', p_accountable_owner uuid DEFAULT NULL, p_owning_org uuid DEFAULT NULL,
  p_reporter uuid DEFAULT NULL, p_data_steward uuid DEFAULT NULL, p_observation_frequency text DEFAULT 'monthly',
  p_is_critical boolean DEFAULT false, p_weight numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v_kr uuid; v_ref text; v_ver uuid; v_next int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: adding a Key Result requires strategy_office/okr_owner/kr_owner'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Key Results are added while the OKR is in draft; change an active OKR through a new version'; END IF;
  IF coalesce(btrim(p_name),'') = '' THEN RAISE EXCEPTION 'MISSING_TITLE: Key Result name is required'; END IF;
  IF p_direction NOT IN ('higher_better','lower_better','band','within_range','maintain_above','maintain_below','exact_target','milestone','custom_curve') THEN
    RAISE EXCEPTION 'INVALID_FORMULA_UNIT_DIRECTION: unknown direction %', p_direction; END IF;
  IF p_update_method NOT IN ('manual','upload','integration','composite') THEN
    RAISE EXCEPTION 'INVALID_OKR: update method must be manual|upload|integration|composite'; END IF;
  INSERT INTO public.strata_key_results
    (okr_id, name, business_definition, unit_id, baseline, baseline_date, target, target_date, direction,
     update_method, accountable_owner_id, owning_org_unit_id, reporter_id, data_steward_id,
     observation_frequency, is_critical, weight, lifecycle,
     order_index)
  VALUES
    (p_okr, p_name, p_business_definition, p_unit_id, p_baseline, p_baseline_date, p_target, p_target_date, p_direction,
     p_update_method, p_accountable_owner, p_owning_org, p_reporter, p_data_steward,
     p_observation_frequency, p_is_critical, p_weight, 'draft',
     COALESCE((SELECT max(order_index)+1 FROM public.strata_key_results WHERE okr_id=p_okr), 0))
  RETURNING id INTO v_kr;
  v_ref := 'KR-' || upper(substr(replace(v_kr::text,'-',''),21,12));
  UPDATE public.strata_key_results
     SET kr_ref = v_ref, slug = lower(v_ref) WHERE id = v_kr;
  INSERT INTO public.strata_kr_versions
    (kr_id, version, status, name, business_definition, baseline, baseline_date, target, target_date, unit_id,
     direction, update_method, accountable_owner_id, owning_org_unit_id, reporter_id, data_steward_id,
     observation_frequency, is_critical, weight)
  VALUES
    (v_kr, 1, 'draft', p_name, p_business_definition, p_baseline, p_baseline_date, p_target, p_target_date, p_unit_id,
     p_direction, p_update_method, p_accountable_owner, p_owning_org, p_reporter, p_data_steward,
     p_observation_frequency, p_is_critical, p_weight)
  RETURNING id INTO v_ver;
  UPDATE public.strata_key_results SET current_version_id = v_ver WHERE id = v_kr;
  RETURN v_kr;
END; $function$;
COMMENT ON FUNCTION public.strata_add_kr IS
  'Add an independent Key Result contract to a draft OKR (invariants 4,5). Never accepts a kpi_id.';
GRANT EXECUTE ON FUNCTION public.strata_add_kr(uuid,text,text,uuid,numeric,date,numeric,date,text,text,uuid,uuid,uuid,uuid,text,boolean,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_assign_kr_roles(
  p_kr uuid, p_accountable_owner uuid DEFAULT NULL, p_owning_org uuid DEFAULT NULL,
  p_reporter uuid DEFAULT NULL, p_data_steward uuid DEFAULT NULL, p_escalation_owner uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: assigning KR roles requires strategy_office/okr_owner/kr_owner'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id = p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  UPDATE public.strata_key_results
     SET accountable_owner_id = COALESCE(p_accountable_owner, accountable_owner_id),
         owning_org_unit_id   = COALESCE(p_owning_org, owning_org_unit_id),
         reporter_id          = COALESCE(p_reporter, reporter_id),
         data_steward_id      = COALESCE(p_data_steward, data_steward_id),
         escalation_owner_id  = COALESCE(p_escalation_owner, escalation_owner_id),
         lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_assign_kr_roles(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_source(
  p_kr uuid, p_update_method text, p_data_source_id uuid DEFAULT NULL,
  p_freshness text DEFAULT NULL, p_observation_frequency text DEFAULT NULL, p_due_schedule jsonb DEFAULT NULL,
  p_evidence_policy text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_update_method NOT IN ('manual','upload','integration','composite') THEN
    RAISE EXCEPTION 'INVALID_OKR: update method must be manual|upload|integration|composite'; END IF;
  IF p_data_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_data_sources WHERE id = p_data_source_id) THEN
    RAISE EXCEPTION 'INVALID_OKR: data source not found'; END IF;
  UPDATE public.strata_key_results
     SET update_method = p_update_method, data_source_id = COALESCE(p_data_source_id, data_source_id),
         freshness_expectation = COALESCE(p_freshness, freshness_expectation),
         observation_frequency = COALESCE(p_observation_frequency, observation_frequency),
         due_schedule = COALESCE(p_due_schedule, due_schedule),
         evidence_policy = COALESCE(p_evidence_policy, evidence_policy),
         lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_source(uuid,text,uuid,text,text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_formula(
  p_kr uuid, p_formula_id uuid DEFAULT NULL, p_formula_version int DEFAULT NULL,
  p_numerator text DEFAULT NULL, p_denominator text DEFAULT NULL, p_component jsonb DEFAULT NULL,
  p_inclusion text DEFAULT NULL, p_exclusion text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  UPDATE public.strata_key_results
     SET formula_id = COALESCE(p_formula_id, formula_id), formula_version = COALESCE(p_formula_version, formula_version),
         numerator_def = COALESCE(p_numerator, numerator_def), denominator_def = COALESCE(p_denominator, denominator_def),
         component_def = COALESCE(p_component, component_def),
         inclusion_rules = COALESCE(p_inclusion, inclusion_rules), exclusion_rules = COALESCE(p_exclusion, exclusion_rules),
         lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_formula(uuid,uuid,int,text,text,jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_phasing(
  p_kr uuid, p_period uuid, p_phased_target numeric DEFAULT NULL, p_milestone_label text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_key_results WHERE id = p_kr) THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period) THEN RAISE EXCEPTION 'INVALID_OKR: period not found'; END IF;
  INSERT INTO public.strata_kr_targets (kr_id, kr_version_id, period_id, phased_target, milestone_label)
    VALUES (p_kr, (SELECT current_version_id FROM public.strata_key_results WHERE id=p_kr), p_period, p_phased_target, p_milestone_label)
  ON CONFLICT (kr_id, period_id) DO UPDATE
    SET phased_target = EXCLUDED.phased_target, milestone_label = EXCLUDED.milestone_label, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_phasing(uuid,uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_reorder_kr(p_kr uuid, p_order int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  UPDATE public.strata_key_results SET order_index = p_order, updated_at = now() WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_reorder_kr(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_retire_kr(p_kr uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'INVALID_OKR: a retirement reason is required'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id = p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  UPDATE public.strata_key_results SET lifecycle = 'retired', updated_at = now() WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_retire_kr(uuid,text) TO authenticated;
