-- CAT-STRATA-IMPL-20260712-001 · A3b · KPI governed revision + revision materiality (D-2/D-3, F-9)
-- Plan Lock: F-9 ruling. Depends on 20260716220000 (lineage) and 20260716230000 (resolver).
--
-- D-3: approved-KPI "retire and recreate" is REPLACED by governed revision. This is that path.
-- F-9: retain the source lineage_id · increment version · set supersedes_id · reset approval fields ·
--      require a reason · clone DEFINITION children (formula configuration) · do NOT clone actuals,
--      historical targets, Key Results, scorecard lines or other measurement facts · leave the
--      predecessor BYTE-IDENTICAL.
--
-- THE LINE THIS RPC DRAWS — and why it is the whole point:
--   CLONE (definition — what the KPI IS):
--     the KPI row's own definition columns + strata_kpi_formula_versions (the formula decides the number)
--   DO NOT CLONE (facts — what was MEASURED):
--     strata_kpi_actuals · strata_kpi_targets · strata_key_results · strata_scorecard_lines
--   DO NOT CLONE (relationships — continuing intent):
--     strata_element_kpis · strata_initiative_kpis · strata_scorecard_model_measures
--   Facts keep the exact version id they used and are NEVER repointed (F-9: "Never repoint a
--   historical fact from v1 to v2"). Relationships are not duplicated either — they resolve through
--   the lineage via strata_resolve_kpi_effective(), which is why v2 inherits them without a single
--   row being rewritten. Cloning either would fabricate history: an actual submitted against v1 was
--   submitted against v1, and duplicating a link would double-count the KPI in its objective.
--
-- REVISION MATERIALITY (F-9) — a required classification on every revision:
--   non_material : wording/owner/metadata; no change to formula, unit, direction, scope or source
--                  semantics. Continuous trend display permitted, with exact provenance.
--   material     : formula, unit or direction change; population/scope change; source-semantic
--                  change; comparability break. Consumers must show a methodology break, must not
--                  silently carry forward an old actual, and must not imply comparability.
--   It is REQUIRED (not defaulted) because defaulting it would be the system asserting "this change
--   is safe to trend through" on behalf of an author who never said so — a comparability lie, and
--   the most expensive kind: it is invisible in the number itself.

-- ── 1. the classification lives on the version it describes ──────────────────
ALTER TABLE public.strata_kpis ADD COLUMN IF NOT EXISTS revision_class text;

ALTER TABLE public.strata_kpis DROP CONSTRAINT IF EXISTS strata_kpis_revision_class_check;
ALTER TABLE public.strata_kpis
  ADD CONSTRAINT strata_kpis_revision_class_check
  CHECK (revision_class IS NULL OR revision_class IN ('non_material','material'));

-- A revision MUST be classified; an original version has nothing to be material RELATIVE TO, so its
-- revision_class stays NULL. NULL therefore means "not a revision", never "unclassified revision".
ALTER TABLE public.strata_kpis DROP CONSTRAINT IF EXISTS strata_kpis_revision_class_required;
ALTER TABLE public.strata_kpis
  ADD CONSTRAINT strata_kpis_revision_class_required
  CHECK (supersedes_id IS NULL OR revision_class IS NOT NULL);

COMMENT ON COLUMN public.strata_kpis.revision_class IS
  'F-9 revision materiality, RELATIVE TO the version this row supersedes. NULL <=> this row is not a revision (supersedes_id IS NULL) — it never means "unclassified". material = formula/unit/direction/scope/source-semantic change or comparability break: consumers must show a methodology break and must not carry an old actual forward or imply comparability. non_material = wording/owner/metadata only: continuous trend permitted with exact provenance.';

-- ── 2. the revision RPC ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_create_kpi_draft_version(
  p_kpi            uuid,
  p_reason         text,
  p_revision_class text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src  public.strata_kpis%ROWTYPE;
  v_new  uuid;
  v_open uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a KPI version requires the strategy_office or admin role';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;

  -- Named explicitly rather than defaulted: see the header.
  IF p_revision_class IS NULL OR p_revision_class NOT IN ('non_material','material') THEN
    RAISE EXCEPTION 'a revision class is required: non_material (wording/owner/metadata only) or material (formula, unit, direction, scope or source-semantic change — breaks comparability)';
  END IF;

  SELECT * INTO v_src FROM public.strata_kpis WHERE id = p_kpi;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;

  IF v_src.status = 'draft' THEN
    RAISE EXCEPTION 'this KPI is already a draft — edit it directly instead of creating a version';
  END IF;

  -- One open successor per LINEAGE (not per row): two drafts anywhere in the lineage would both
  -- claim to be the next version, and approving both would collide on (lineage_id, version).
  SELECT id INTO v_open
    FROM public.strata_kpis
   WHERE lineage_id = v_src.lineage_id AND status IN ('draft','pending_approval')
   LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a draft version of this KPI already exists (%) — finish or discard it first', v_open;
  END IF;

  -- The clone. Definition columns only.
  --  * lineage_id: the SOURCE's — this is the whole mechanism. A fresh lineage would orphan v2 from
  --    every relationship and fact that came before it.
  --  * version: max+1 across the lineage, not v_src.version+1 — the source may not be the highest
  --    (e.g. revising a superseded version), and (lineage_id, version) is UNIQUE.
  --  * slug NULL -> trg_strata_kpis_slug dedupes.
  --  * created_by omitted -> auth.uid() default -> SoD (the author cannot approve it).
  --  * approval + effective fields reset: a draft has never been approved and must not claim to be.
  INSERT INTO public.strata_kpis (
    organization_id, name, slug, description, business_meaning, kpi_type_id,
    unit, direction, frequency, entry_method,
    accountable_owner_id, data_owner_id, reporter_id, validator_id, escalation_owner_id,
    data_source_id, threshold_scheme_id, is_strategic,
    lineage_id, version, status,
    effective_from, effective_to, approved_by, approved_at,
    change_reason, supersedes_id, revision_class
  )
  SELECT
    v_src.organization_id, v_src.name, NULL, v_src.description, v_src.business_meaning, v_src.kpi_type_id,
    v_src.unit, v_src.direction, v_src.frequency, v_src.entry_method,
    v_src.accountable_owner_id, v_src.data_owner_id, v_src.reporter_id, v_src.validator_id, v_src.escalation_owner_id,
    v_src.data_source_id, v_src.threshold_scheme_id, v_src.is_strategic,
    v_src.lineage_id,
    (SELECT max(version) + 1 FROM public.strata_kpis WHERE lineage_id = v_src.lineage_id),
    'draft',
    NULL, NULL, NULL, NULL,
    p_reason, p_kpi, p_revision_class
  RETURNING id INTO v_new;

  -- DEFINITION child: the formula decides the number, so v2 must carry its own copy. Only the
  -- formula rows belonging to the source version are copied, and their approval fields are reset
  -- for the same reason the parent's are.
  INSERT INTO public.strata_kpi_formula_versions (
    kpi_id, version, expression, variables, formula_type, normalization,
    effective_from, status, approved_by, approved_at, change_reason)
  SELECT v_new, f.version, f.expression, f.variables, f.formula_type, f.normalization,
         NULL, 'draft', NULL, NULL, format('cloned from KPI v%s', v_src.version)
    FROM public.strata_kpi_formula_versions f
   WHERE f.kpi_id = p_kpi;

  -- NO actuals, NO targets, NO key results, NO scorecard lines, NO element/initiative links, NO
  -- model measures are copied. Facts keep the version that produced them; relationships resolve
  -- through the lineage. This absence is the design, not an omission.

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', v_new, 'RPC:create_kpi_draft_version', auth.uid(),
          format('%s draft cloned from v%s (%s) [%s]: %s',
                 'v' || (SELECT max(version) FROM public.strata_kpis WHERE lineage_id = v_src.lineage_id),
                 v_src.version, v_src.name, p_revision_class, p_reason));

  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_create_kpi_draft_version(uuid, text, text) TO authenticated;
