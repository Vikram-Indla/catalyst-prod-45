-- CAT-STRATA-EXECMODEL-20260721-001 — Stage 1a (S16): Objective-owned OKR ownership edge.
-- Additive, forward-only, idempotent. D-0 (Objective-owned OKR) + D-1 (re-parent ACTIVE only;
-- closed frozen; ambiguous parked as exceptions, never guessed). theme_id retained as derived
-- history and NEVER rewritten. New OKRs authored under an Objective via strata_create_okr_v3.
-- Applied to staging (cyijbdeuehohvhnsywig) as version 20260721102019; ledger 1:1 with this file.

-- 1. Authoritative objective ownership column (Objective = element_type='objective', parent=theme)
ALTER TABLE public.strata_okrs
  ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT;
ALTER TABLE public.strata_okr_versions
  ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_strata_okrs_objective ON public.strata_okrs(objective_id);

-- 2. Integrity trigger: objective_id must be an 'objective' whose parent is a 'theme';
--    theme_id (if set) must equal that parent (keeps derived theme consistent; no history rewrite).
CREATE OR REPLACE FUNCTION public.strata_okr_objective_check() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE et text; ptheme uuid;
BEGIN
  IF NEW.objective_id IS NOT NULL THEN
    SELECT element_type, parent_id INTO et, ptheme
      FROM public.strata_strategy_elements WHERE id = NEW.objective_id;
    IF et IS NULL THEN RAISE EXCEPTION 'MISSING_OBJECTIVE: objective % not found', NEW.objective_id; END IF;
    IF et <> 'objective' THEN
      RAISE EXCEPTION 'INVALID_OBJECTIVE: an OKR must belong to a Strategic Objective, not a % element', et; END IF;
    IF ptheme IS NULL OR NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id=ptheme AND element_type='theme') THEN
      RAISE EXCEPTION 'INVALID_OBJECTIVE: objective % has no parent Strategic Theme', NEW.objective_id; END IF;
    IF NEW.theme_id IS NOT NULL AND NEW.theme_id <> ptheme THEN
      RAISE EXCEPTION 'OBJECTIVE_THEME_MISMATCH: objective parent theme % <> okr theme_id %', ptheme, NEW.theme_id; END IF;
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_okr_objective_check ON public.strata_okrs;
CREATE TRIGGER trg_strata_okr_objective_check BEFORE INSERT OR UPDATE OF objective_id ON public.strata_okrs
  FOR EACH ROW EXECUTE FUNCTION public.strata_okr_objective_check();

-- 3. Objective re-parent provenance map (additive; separate from CHECK-constrained migration_map)
CREATE TABLE IF NOT EXISTS public.strata_okr_objective_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.strata_okrs(id) ON DELETE CASCADE,
  resolved_objective_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL,
  method text CHECK (method IN ('legacy_objective_element','sole_child_objective')),
  is_exception boolean NOT NULL DEFAULT false,
  reason text,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (okr_id)
);
COMMENT ON TABLE public.strata_okr_objective_map IS
  'Deterministic Objective re-parent provenance for ACTIVE OKRs (CAT-STRATA-EXECMODEL-20260721-001 S16, D-1). Exceptions enumerated, never guessed. Closed OKRs excluded (frozen history).';
ALTER TABLE public.strata_okr_objective_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_okr_objective_map_select ON public.strata_okr_objective_map;
CREATE POLICY strata_okr_objective_map_select ON public.strata_okr_objective_map FOR SELECT
  USING (public.current_user_is_approved());
DROP POLICY IF EXISTS strata_okr_objective_map_write ON public.strata_okr_objective_map;
CREATE POLICY strata_okr_objective_map_write ON public.strata_okr_objective_map FOR ALL
  USING (public.strata_is_admin()) WITH CHECK (public.strata_is_admin());

-- 4. Deterministic backfill — ACTIVE (non-terminal) OKRs only. Closed/cancelled/withdrawn/rejected excluded.
-- Method A: legacy objective_element_id already points at an 'objective'.
WITH cand AS (
  SELECT o.id AS okr_id, o.objective_element_id AS obj
  FROM public.strata_okrs o
  JOIN public.strata_strategy_elements e ON e.id = o.objective_element_id AND e.element_type='objective'
  WHERE o.status IN ('draft','submitted','active','closing_review') AND o.objective_id IS NULL
),
upd AS (
  UPDATE public.strata_okrs o SET objective_id = c.obj FROM cand c WHERE o.id = c.okr_id
  RETURNING o.id AS okr_id, o.objective_id AS obj
)
INSERT INTO public.strata_okr_objective_map (okr_id, resolved_objective_id, method, is_exception, reason)
SELECT okr_id, obj, 'legacy_objective_element', false,
       'active OKR; objective resolved from legacy objective_element_id'
FROM upd ON CONFLICT (okr_id) DO NOTHING;

-- Method B: theme has exactly one child 'objective'.
WITH cand AS (
  SELECT o.id AS okr_id,
    (SELECT c.id FROM public.strata_strategy_elements c WHERE c.parent_id=o.theme_id AND c.element_type='objective') AS obj
  FROM public.strata_okrs o
  WHERE o.status IN ('draft','submitted','active','closing_review') AND o.objective_id IS NULL
    AND o.theme_id IS NOT NULL
    AND (SELECT count(*) FROM public.strata_strategy_elements c WHERE c.parent_id=o.theme_id AND c.element_type='objective') = 1
),
upd AS (
  UPDATE public.strata_okrs o SET objective_id = c.obj FROM cand c WHERE o.id = c.okr_id
  RETURNING o.id AS okr_id, o.objective_id AS obj
)
INSERT INTO public.strata_okr_objective_map (okr_id, resolved_objective_id, method, is_exception, reason)
SELECT okr_id, obj, 'sole_child_objective', false,
       'active OKR; objective resolved as the sole child Objective of the OKR theme'
FROM upd ON CONFLICT (okr_id) DO NOTHING;

-- Exceptions: remaining active OKRs with no deterministic objective — parked, never guessed.
INSERT INTO public.strata_okr_objective_map (okr_id, resolved_objective_id, method, is_exception, reason)
SELECT o.id, NULL, NULL, true,
  CASE WHEN o.theme_id IS NULL
       THEN 'active OKR with no theme and no legacy objective link — requires human Objective assignment'
       ELSE 'active OKR whose theme has 0 or >1 child Objectives — requires human Objective selection' END
FROM public.strata_okrs o
WHERE o.status IN ('draft','submitted','active','closing_review') AND o.objective_id IS NULL
ON CONFLICT (okr_id) DO NOTHING;

CREATE OR REPLACE VIEW public.strata_okr_objective_exceptions AS
  SELECT m.*, o.name AS okr_name, o.status AS okr_status
  FROM public.strata_okr_objective_map m
  JOIN public.strata_okrs o ON o.id = m.okr_id
  WHERE m.is_exception = true;
GRANT SELECT ON public.strata_okr_objective_exceptions TO authenticated;

-- 5. Validator: Objective now required alongside Theme (transition-gated; existing rows untouched).
CREATE OR REPLACE FUNCTION public.strata_okr_validate(p_okr uuid, p_stage text DEFAULT 'submit')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_total int; codes text[] := '{}';
BEGIN
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['OKR_NOT_FOUND']); END IF;
  IF o.theme_id IS NULL THEN codes := array_append(codes, 'MISSING_THEME');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.theme_id AND element_type='theme')
    THEN codes := array_append(codes, 'INVALID_THEME'); END IF;
  IF o.objective_id IS NULL THEN codes := array_append(codes, 'MISSING_OBJECTIVE');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.objective_id AND element_type='objective')
    THEN codes := array_append(codes, 'INVALID_OBJECTIVE'); END IF;
  IF coalesce(btrim(o.objective_statement),'') = '' THEN codes := array_append(codes, 'MISSING_OBJECTIVE_STATEMENT'); END IF;
  IF o.owner_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNER'); END IF;
  IF o.owning_org_unit_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNING_ORG'); END IF;
  IF o.cycle_id IS NULL THEN codes := array_append(codes, 'MISSING_CYCLE'); END IF;
  IF coalesce(o.start_period_id, o.period_id) IS NULL THEN codes := array_append(codes, 'MISSING_START_PERIOD'); END IF;
  SELECT count(*) INTO kr_total FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_total = 0 THEN codes := array_append(codes, 'NO_KEY_RESULTS');
  ELSIF kr_total < 2 OR kr_total > 4 THEN codes := array_append(codes, 'KR_COUNT_OUT_OF_BAND');
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'kr_count', kr_total, 'stage', p_stage);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_okr_validate(uuid, text) TO authenticated;

-- 6. Objective-owned create RPC (derives + locks theme from the objective's parent).
CREATE OR REPLACE FUNCTION public.strata_create_okr_v3(
  p_objective uuid, p_name text, p_objective_statement text,
  p_cycle uuid DEFAULT NULL, p_owner uuid DEFAULT NULL, p_owning_org uuid DEFAULT NULL,
  p_commitment text DEFAULT 'committed', p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_obj record; v_theme uuid; v_cycle uuid; v_okr uuid; v_ver uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: creating an OKR requires strategy_office, okr_owner or admin'; END IF;
  IF p_name IS NULL OR btrim(p_name)='' THEN RAISE EXCEPTION 'MISSING_NAME: OKR name is required'; END IF;
  IF p_objective_statement IS NULL OR btrim(p_objective_statement)='' THEN
    RAISE EXCEPTION 'MISSING_OBJECTIVE_STATEMENT: a qualitative objective statement is required'; END IF;
  SELECT * INTO v_obj FROM public.strata_strategy_elements WHERE id = p_objective;
  IF v_obj.id IS NULL THEN RAISE EXCEPTION 'MISSING_OBJECTIVE: objective not found'; END IF;
  IF v_obj.element_type <> 'objective' THEN
    RAISE EXCEPTION 'INVALID_OBJECTIVE: an OKR must be created under a Strategic Objective, not a % element', v_obj.element_type; END IF;
  SELECT id INTO v_theme FROM public.strata_strategy_elements WHERE id = v_obj.parent_id AND element_type='theme';
  IF v_theme IS NULL THEN RAISE EXCEPTION 'INVALID_OBJECTIVE: objective has no parent Strategic Theme'; END IF;
  IF p_commitment IS NOT NULL AND p_commitment NOT IN ('committed','aspirational') THEN
    RAISE EXCEPTION 'INVALID_OKR: commitment must be committed|aspirational'; END IF;
  IF p_owning_org IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_org_units WHERE id = p_owning_org) THEN
    RAISE EXCEPTION 'INVALID_OKR: owning organisation unit not found'; END IF;
  v_cycle := COALESCE(p_cycle, v_obj.cycle_id);
  INSERT INTO public.strata_okrs
    (objective_id, theme_id, name, objective_statement, cycle_id, owner_id, owning_org_unit_id, commitment,
     start_period_id, period_id, end_period_id, status)
  VALUES
    (p_objective, v_theme, p_name, p_objective_statement, v_cycle, p_owner, p_owning_org, p_commitment,
     p_start_period, p_start_period, p_end_period, 'draft')
  RETURNING id INTO v_okr;
  INSERT INTO public.strata_okr_versions
    (okr_id, version, status, objective_statement, objective_id, theme_id, cycle_id, start_period_id, end_period_id,
     commitment, owner_id, owning_org_unit_id)
  VALUES
    (v_okr, 1, 'draft', p_objective_statement, p_objective, v_theme, v_cycle, p_start_period, p_end_period,
     p_commitment, p_owner, p_owning_org)
  RETURNING id INTO v_ver;
  UPDATE public.strata_okrs SET current_version_id = v_ver WHERE id = v_okr;
  RETURN v_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_okr_v3(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) TO authenticated;
COMMENT ON FUNCTION public.strata_create_okr_v2(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) IS
  'DEPRECATED (CAT-STRATA-EXECMODEL-20260721-001 S16): Theme-owned create. Superseded by strata_create_okr_v3 (Objective-owned). Retained for history; dead-path removal deferred to Stage 6.';
