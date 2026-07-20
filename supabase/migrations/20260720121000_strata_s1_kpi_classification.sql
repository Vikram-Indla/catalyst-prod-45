-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S1 — governed KPI classification layer
-- Forward-only, additive. Complements (does NOT replace) is_strategic per D-1.
-- Existing approved KPIs are never re-validated; all existing rows are backfilled
-- so no KPI is left unclassified.
--
-- Closes gaps:
--   STRATA-KPI-004/005 — usage_class, business_category, official_scope, kr_eligible,
--                        aggregation_policy as governed dimensions distinct from
--                        kpi_type (calculation behavior) and is_strategic.
--   STRATA-KPI-006     — direct Theme/Objective->KPI links marked diagnostic (they do
--                        not form a competing official hierarchy; official measurement
--                        flows Theme -> Strategic Objective -> OKR -> KR [-> Assignment]).
--   STRATA-KPI-022     — submission validator requires a usage class + a consistent
--                        KR-eligibility flag before submit/approve.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Governed business-category dictionary (subject area)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kpi_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_kpi_categories IS
  'Governed KPI business-category dictionary (subject area). Distinct from kpi_type (calculation) and usage_class (Strategic/Operational/...). Seedless: empty = render nothing (zero-assumption).';
ALTER TABLE public.strata_kpi_categories ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_categories' AND policyname='strata_kpi_categories_read') THEN
    CREATE POLICY strata_kpi_categories_read ON public.strata_kpi_categories
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_categories' AND policyname='strata_kpi_categories_write') THEN
    CREATE POLICY strata_kpi_categories_write ON public.strata_kpi_categories
      FOR ALL TO authenticated
      USING (public.strata_has_role(ARRAY['strategy_office']))
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.strata_upsert_kpi_category(p_name text, p_slug text DEFAULT NULL, p_description text DEFAULT NULL, p_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_slug text; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: managing KPI categories requires strategy_office'; END IF;
  IF coalesce(btrim(p_name),'') = '' THEN RAISE EXCEPTION 'MISSING_NAME: category name is required'; END IF;
  v_slug := COALESCE(NULLIF(btrim(p_slug),''), lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  INSERT INTO public.strata_kpi_categories (name, slug, description, active)
  VALUES (p_name, v_slug, p_description, p_active)
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, active=EXCLUDED.active
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_upsert_kpi_category(text,text,text,boolean) TO authenticated;

-- ===========================================================================
-- 2. Governed classification columns on strata_kpis (additive)
-- ===========================================================================
ALTER TABLE public.strata_kpis
  ADD COLUMN IF NOT EXISTS usage_class text
    CHECK (usage_class IS NULL OR usage_class IN ('strategic','operational','project_outcome','project_delivery','risk_compliance')),
  ADD COLUMN IF NOT EXISTS business_category_id uuid REFERENCES public.strata_kpi_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS official_scope text
    CHECK (official_scope IS NULL OR official_scope IN ('enterprise','department','project','none')),
  ADD COLUMN IF NOT EXISTS kr_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aggregation_policy text NOT NULL DEFAULT 'none'
    CHECK (aggregation_policy IN ('none','sum','average','weighted_average'));

COMMENT ON COLUMN public.strata_kpis.usage_class IS
  'Governed usage class: strategic|operational|project_outcome|project_delivery|risk_compliance (STRATA-KPI-005). Complements is_strategic; separate from kpi_type (calculation behavior).';
COMMENT ON COLUMN public.strata_kpis.kr_eligible IS
  'Whether an approved, effective assignment of this KPI may officially back a Key Result (STRATA-KPI-005/014). Only strategic usage classes may be KR-eligible.';
COMMENT ON COLUMN public.strata_kpis.aggregation_policy IS
  'How this KPI aggregates when it is a roll-up parent: none|sum|average|weighted_average (STRATA-KPI-022/031). Default none = does not aggregate.';

-- Deterministic backfill (zero-assumption): usage_class from is_strategic only;
-- official_scope / business_category left NULL (unknown -> nothing); kr_eligible false.
UPDATE public.strata_kpis
   SET usage_class = CASE WHEN is_strategic THEN 'strategic' ELSE 'operational' END
 WHERE usage_class IS NULL;

-- ===========================================================================
-- 3. STRATA-KPI-006 — direct element<->KPI links are diagnostic, not the hierarchy
-- ===========================================================================
ALTER TABLE public.strata_element_kpis
  ADD COLUMN IF NOT EXISTS link_role text NOT NULL DEFAULT 'diagnostic'
    CHECK (link_role IN ('diagnostic','governed_contract'));
COMMENT ON COLUMN public.strata_element_kpis.link_role IS
  'diagnostic (default): a direct Theme/Objective KPI indicator, NOT an official measurement path. Official measurement flows Theme->Strategic Objective->OKR->KR (STRATA-KPI-006/007). governed_contract reserved for a future governed measurement contract.';
-- existing rows already default to diagnostic via the column default; make it explicit for clarity
UPDATE public.strata_element_kpis SET link_role = 'diagnostic' WHERE link_role IS NULL;

-- ===========================================================================
-- 4. STRATA-KPI-022 — submission validator requires a governed usage class
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_kpi_submission_blockers(
  p_kpi uuid,
  p_submitter uuid DEFAULT auth.uid()
)
RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k record; v text[] := '{}'::text[]; formula_ok int; target_ok int; tc record;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;

  IF k.accountable_owner_id IS NULL THEN v := array_append(v, 'Assign an accountable owner'); END IF;
  IF k.data_owner_id IS NULL THEN v := array_append(v, 'Assign a data owner'); END IF;
  IF k.reporter_id IS NULL THEN v := array_append(v, 'Assign a reporter'); END IF;
  IF k.validator_id IS NULL THEN v := array_append(v, 'Assign a validator'); END IF;

  IF k.validator_id IS NOT NULL AND k.validator_id = k.accountable_owner_id THEN
    v := array_append(v, 'Validator must differ from the accountable owner (segregation of duties)');
  END IF;
  IF p_submitter IS NOT NULL AND k.validator_id IS NOT NULL AND k.validator_id = p_submitter THEN
    v := array_append(v, 'Validator must differ from the person submitting for approval (segregation of duties)');
  END IF;

  IF k.kpi_type_id IS NOT NULL AND k.escalation_owner_id IS NULL THEN
    SELECT name, mandatory_metadata INTO tc FROM public.strata_kpi_type_configs WHERE id = k.kpi_type_id;
    IF tc.mandatory_metadata IS NOT NULL AND tc.mandatory_metadata ? 'escalation_owner' THEN
      v := array_append(v, format('Assign an escalation owner (required by the %s KPI type)', tc.name));
    END IF;
  END IF;

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

  IF k.is_strategic AND NOT EXISTS (SELECT 1 FROM public.strata_element_kpis WHERE kpi_id = p_kpi) THEN
    v := array_append(v, 'Link this Strategic KPI to at least one strategy element (cycle / theme / objective / perspective)');
  END IF;

  -- STRATA-KPI-022: governed usage class is mandatory; KR-eligibility must be consistent with it.
  IF k.usage_class IS NULL THEN
    v := array_append(v, 'Classify the KPI usage class (strategic / operational / project outcome / project delivery / risk & compliance)');
  END IF;
  IF k.kr_eligible AND coalesce(k.usage_class,'') NOT IN ('strategic','project_outcome') THEN
    v := array_append(v, 'KR-eligibility is only valid for a strategic or project-outcome usage class');
  END IF;

  RETURN v;
END;
$function$;
COMMENT ON FUNCTION public.strata_kpi_submission_blockers(uuid, uuid) IS
  'Unmet governed prerequisites for a KPI (KO-DEF-001 + KPI-OPMODEL S1). SINGLE source of truth for submit/approve/UI. S1 adds: usage_class required, kr_eligible consistent with usage_class.';
GRANT EXECUTE ON FUNCTION public.strata_kpi_submission_blockers(uuid, uuid) TO authenticated;

-- ===========================================================================
-- 5. Classification write path (does not touch create/update signatures)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_classify_kpi(
  p_kpi uuid, p_usage_class text DEFAULT NULL, p_official_scope text DEFAULT NULL,
  p_kr_eligible boolean DEFAULT NULL, p_aggregation_policy text DEFAULT NULL,
  p_business_category uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: classifying a KPI requires strategy_office or kpi_owner'; END IF;
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.status IN ('approved','retired','superseded') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: an approved/retired KPI is reclassified through a new version, not in place'; END IF;
  IF p_usage_class IS NOT NULL AND p_usage_class NOT IN ('strategic','operational','project_outcome','project_delivery','risk_compliance') THEN
    RAISE EXCEPTION 'INVALID_USAGE_CLASS: %', p_usage_class; END IF;
  IF p_official_scope IS NOT NULL AND p_official_scope NOT IN ('enterprise','department','project','none') THEN
    RAISE EXCEPTION 'INVALID_OFFICIAL_SCOPE: %', p_official_scope; END IF;
  IF p_aggregation_policy IS NOT NULL AND p_aggregation_policy NOT IN ('none','sum','average','weighted_average') THEN
    RAISE EXCEPTION 'INVALID_AGGREGATION_POLICY: %', p_aggregation_policy; END IF;
  IF p_business_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_categories WHERE id = p_business_category) THEN
    RAISE EXCEPTION 'INVALID_CATEGORY: business category not found'; END IF;
  UPDATE public.strata_kpis
     SET usage_class = COALESCE(p_usage_class, usage_class),
         official_scope = COALESCE(p_official_scope, official_scope),
         kr_eligible = COALESCE(p_kr_eligible, kr_eligible),
         aggregation_policy = COALESCE(p_aggregation_policy, aggregation_policy),
         business_category_id = COALESCE(p_business_category, business_category_id),
         updated_at = now()
   WHERE id = p_kpi;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_classify_kpi(uuid,text,text,boolean,text,uuid) TO authenticated;
