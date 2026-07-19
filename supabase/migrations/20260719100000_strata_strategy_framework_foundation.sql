-- CAT-STRATA-GOVFRAMEWORK-20260719-001 — Slice 1: Strategy Framework foundation
-- Separates the Corporate Strategy Framework (identity + governed version + members)
-- from the Perspective *definition* (strata_perspectives) and the Scorecard Model version.
--
-- WHY: today there is no framework table. The "framework" is implied by the flat set of
-- approved perspectives whose strata_perspectives.default_weight happens to sum to 100
-- (see StrataMeasurementPage "Weights total 100" banner). That is the anti-pattern this
-- feature corrects: a framework must be an explicit, governed, versioned object whose
-- effective version totals exactly 100%, independent of any perspective's default_weight.
--
-- This slice is SCHEMA + VALIDATOR ONLY. Governance RPCs (submit/approve/etc.), the
-- generic-whitelist onboarding, and the backfill of Framework Version 1 come in later,
-- independently-verified slices. No existing table or RPC is modified except two
-- metadata-only COMMENTs marking strata_perspectives.default_weight/order_index deprecated.
--
-- Forward-only. Reuses foundation primitives: strata_generate_slug(), strata_touch_updated_at(),
-- strata_audit(), strata_has_role(), strata_is_admin(), current_user_is_approved().

-- ---------------------------------------------------------------------------
-- A. Framework identity (stable lineage). Name/description mutable; slug frozen.
-- ---------------------------------------------------------------------------
CREATE TABLE public.strata_strategy_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  framework_key text UNIQUE,            -- stable business key (e.g. 'corporate'); optional
  name text NOT NULL,
  slug text UNIQUE,                     -- frozen on insert by strata_generate_slug()
  description text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_strategy_frameworks IS
  'Strategy Framework identity/lineage. A framework has many governed versions; exactly one is effective at a time (see strata_strategy_framework_versions).';

-- ---------------------------------------------------------------------------
-- B. Governed framework VERSION. Rich lifecycle (mirrors scorecard-model governance).
--    updated_at doubles as the optimistic-concurrency token.
-- ---------------------------------------------------------------------------
CREATE TABLE public.strata_strategy_framework_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.strata_strategy_frameworks(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','changes_requested','pending_approval','approved','rejected','superseded','retired')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id uuid REFERENCES public.strata_strategy_framework_versions(id) ON DELETE SET NULL,
  change_reason text,
  assigned_approver_id uuid,
  submitted_at timestamptz,
  submitted_by uuid,
  decision_note text,
  -- provenance: 'workflow' = created + approved through the governed maker-checker flow.
  -- 'legacy_unverified' = migrated from pre-framework data where the original approver/
  -- timestamp cannot be proven (D-E). Never invent governance facts.
  provenance text NOT NULL DEFAULT 'workflow' CHECK (provenance IN ('workflow','legacy_unverified')),
  CONSTRAINT strata_sfv_unique_version UNIQUE (framework_id, version),
  CONSTRAINT strata_sfv_effective_dates CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
  CONSTRAINT strata_sfv_no_self_supersede CHECK (supersedes_id IS NULL OR supersedes_id <> id)
);
COMMENT ON TABLE public.strata_strategy_framework_versions IS
  'Governed Strategy Framework versions. Status transitions past draft are RPC-only. updated_at is the optimistic-concurrency token.';

-- At most ONE currently-effective approved version per framework.
CREATE UNIQUE INDEX strata_sfv_one_effective
  ON public.strata_strategy_framework_versions (framework_id)
  WHERE status = 'approved' AND effective_to IS NULL;

-- At most ONE in-flight (open) version per framework — prevents competing drafts.
-- Resubmission reuses the same version; a new draft can only start once the prior open one resolves.
CREATE UNIQUE INDEX strata_sfv_one_open
  ON public.strata_strategy_framework_versions (framework_id)
  WHERE status IN ('draft','changes_requested','pending_approval');

-- ---------------------------------------------------------------------------
-- C. Framework MEMBERS — the (perspective, weight, order) rows a version owns.
--    Perspective definitions do NOT carry operational framework weight/position;
--    that lives here, per version.
-- ---------------------------------------------------------------------------
CREATE TABLE public.strata_strategy_framework_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_version_id uuid NOT NULL REFERENCES public.strata_strategy_framework_versions(id) ON DELETE CASCADE,
  perspective_id uuid NOT NULL REFERENCES public.strata_perspectives(id) ON DELETE RESTRICT,
  weight numeric(6,3) NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_sfm_unique_perspective UNIQUE (framework_version_id, perspective_id),
  CONSTRAINT strata_sfm_unique_order UNIQUE (framework_version_id, order_index),
  CONSTRAINT strata_sfm_weight_range CHECK (weight >= 0 AND weight <= 100),
  CONSTRAINT strata_sfm_order_nonneg CHECK (order_index >= 0)
);
COMMENT ON TABLE public.strata_strategy_framework_members IS
  'Perspective membership of a framework version: the authoritative source of framework weight + order (NOT strata_perspectives.default_weight/order_index).';

-- ---------------------------------------------------------------------------
-- D. Deprecate perspective-definition operational columns (metadata only — not dropped).
--    Read framework weight/order from members above. Drop is a later, verified cleanup.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.strata_perspectives.default_weight IS
  'DEPRECATED (CAT-STRATA-GOVFRAMEWORK-20260719-001): a Perspective definition no longer owns framework weight. Framework weight lives in strata_strategy_framework_members.weight. Retained for compatibility; do not write new operational values. Drop in a later verified migration.';
COMMENT ON COLUMN public.strata_perspectives.order_index IS
  'DEPRECATED (CAT-STRATA-GOVFRAMEWORK-20260719-001): a Perspective definition no longer owns framework position. Framework order lives in strata_strategy_framework_members.order_index. Retained for compatibility; do not write new operational values. Drop in a later verified migration.';

-- ---------------------------------------------------------------------------
-- E. Supersession integrity trigger — supersedes must belong to the same framework.
--    (A cross-framework or dangling supersedes_id is a broken lineage.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_sfv_check_supersedes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.supersedes_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.strata_strategy_framework_versions p
      WHERE p.id = NEW.supersedes_id AND p.framework_id = NEW.framework_id
    ) THEN
      RAISE EXCEPTION 'supersedes_id % must reference a version of the same framework', NEW.supersedes_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_strata_sfv_supersedes
  BEFORE INSERT OR UPDATE ON public.strata_strategy_framework_versions
  FOR EACH ROW EXECUTE FUNCTION public.strata_sfv_check_supersedes();

-- ---------------------------------------------------------------------------
-- F. Authoritative framework-version integrity validator (single source of truth).
--    Used by UI preview, submit, approve, migration verification, and tests — never
--    duplicate this logic. Structural checks only; approver ROLE/PROFILE eligibility is
--    enforced in the submit RPC (Slice 2), mirroring the scorecard validator/submit split.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_validate_strategy_framework_version(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_framework uuid; v_status text; v_created_by uuid; v_assigned uuid;
  v_eff_from timestamptz; v_eff_to timestamptz; v_supersedes uuid;
  v_count int; v_total numeric := 0; v_weight_code text := 'FRAMEWORK_WEIGHTS_VALID';
  v_blockers jsonb := '[]'::jsonb; v_passed jsonb := '[]'::jsonb; v_issues jsonb := '[]'::jsonb;
  v_retired uuid[]; v_ineligible uuid[]; v_dup_order int; v_dup_persp int;
BEGIN
  SELECT framework_id, status, created_by, assigned_approver_id, effective_from, effective_to, supersedes_id
    INTO v_framework, v_status, v_created_by, v_assigned, v_eff_from, v_eff_to, v_supersedes
    FROM public.strata_strategy_framework_versions WHERE id = p_version;
  IF v_framework IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'total_weight', 0, 'member_count', 0,
      'weight_code','VERSION_NOT_FOUND',
      'blockers', jsonb_build_array('Framework version not found'), 'passed','[]'::jsonb,
      'issues', jsonb_build_array(jsonb_build_object('code','VERSION_NOT_FOUND','message','Framework version not found','perspective_ids','[]'::jsonb)));
  END IF;

  SELECT COUNT(*), COALESCE(SUM(weight),0) INTO v_count, v_total
    FROM public.strata_strategy_framework_members WHERE framework_version_id = p_version;

  -- Member count + weight total (the 100% enforcement)
  IF v_count = 0 THEN
    v_weight_code := 'NO_MEMBERS';
    v_blockers := v_blockers || to_jsonb('Framework version has no perspectives'::text);
    v_issues := v_issues || jsonb_build_object('code','NO_MEMBERS','message','Framework version has no perspectives','perspective_ids','[]'::jsonb);
  ELSIF v_total < 100 - 0.01 THEN
    v_weight_code := 'FRAMEWORK_WEIGHTS_UNDER_100';
    v_blockers := v_blockers || to_jsonb(format('Framework weights total %s — assign the remaining %s', round(v_total,3), round(100 - v_total,3)));
    v_issues := v_issues || jsonb_build_object('code','FRAMEWORK_WEIGHTS_UNDER_100','message',format('Framework weights total %s — assign the remaining %s', round(v_total,3), round(100 - v_total,3)),'perspective_ids','[]'::jsonb);
  ELSIF v_total > 100 + 0.01 THEN
    v_weight_code := 'FRAMEWORK_WEIGHTS_OVER_100';
    v_blockers := v_blockers || to_jsonb(format('Framework weights total %s — remove %s', round(v_total,3), round(v_total - 100,3)));
    v_issues := v_issues || jsonb_build_object('code','FRAMEWORK_WEIGHTS_OVER_100','message',format('Framework weights total %s — remove %s', round(v_total,3), round(v_total - 100,3)),'perspective_ids','[]'::jsonb);
  ELSE
    v_passed := v_passed || to_jsonb('Framework weights total 100'::text);
  END IF;

  -- Retired perspective in members (blocked for any effective version)
  SELECT array_agg(m.perspective_id) INTO v_retired
    FROM public.strata_strategy_framework_members m
    JOIN public.strata_perspectives p ON p.id = m.perspective_id
    WHERE m.framework_version_id = p_version AND p.status = 'retired';
  IF v_retired IS NOT NULL THEN
    v_blockers := v_blockers || to_jsonb('Framework includes retired perspective(s)'::text);
    v_issues := v_issues || jsonb_build_object('code','RETIRED_PERSPECTIVE_MEMBER','message','Framework includes retired perspective(s)','perspective_ids', to_jsonb(v_retired));
  END IF;

  -- Ineligible members (not approved and not retired → draft/pending/superseded)
  SELECT array_agg(m.perspective_id) INTO v_ineligible
    FROM public.strata_strategy_framework_members m
    JOIN public.strata_perspectives p ON p.id = m.perspective_id
    WHERE m.framework_version_id = p_version AND p.status NOT IN ('approved','retired');
  IF v_ineligible IS NOT NULL THEN
    v_blockers := v_blockers || to_jsonb('Framework includes perspective(s) that are not approved'::text);
    v_issues := v_issues || jsonb_build_object('code','INELIGIBLE_PERSPECTIVE_MEMBER','message','Framework includes perspective(s) that are not approved','perspective_ids', to_jsonb(v_ineligible));
  END IF;

  -- Duplicate order / perspective (DB constraints make these impossible to persist;
  -- checked defensively so the validator is a complete structural authority).
  SELECT COUNT(*) INTO v_dup_order FROM (
    SELECT order_index FROM public.strata_strategy_framework_members
    WHERE framework_version_id = p_version GROUP BY order_index HAVING COUNT(*) > 1) d;
  IF v_dup_order > 0 THEN
    v_blockers := v_blockers || to_jsonb('Duplicate position among members'::text);
    v_issues := v_issues || jsonb_build_object('code','DUPLICATE_ORDER','message','Duplicate position among members','perspective_ids','[]'::jsonb);
  END IF;
  SELECT COUNT(*) INTO v_dup_persp FROM (
    SELECT perspective_id FROM public.strata_strategy_framework_members
    WHERE framework_version_id = p_version GROUP BY perspective_id HAVING COUNT(*) > 1) d;
  IF v_dup_persp > 0 THEN
    v_blockers := v_blockers || to_jsonb('Duplicate perspective among members'::text);
    v_issues := v_issues || jsonb_build_object('code','DUPLICATE_PERSPECTIVE','message','Duplicate perspective among members','perspective_ids','[]'::jsonb);
  END IF;

  -- Maker-checker self-conflict (assigned approver cannot be the version creator)
  IF v_assigned IS NOT NULL AND v_assigned = v_created_by THEN
    v_blockers := v_blockers || to_jsonb('Assigned approver cannot be the version creator (maker-checker)'::text);
    v_issues := v_issues || jsonb_build_object('code','MAKER_CHECKER_CONFLICT','message','Assigned approver cannot be the version creator','perspective_ids','[]'::jsonb);
  END IF;

  -- Supersession integrity
  IF v_supersedes IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.strata_strategy_framework_versions s WHERE s.id = v_supersedes AND s.framework_id = v_framework
  ) THEN
    v_blockers := v_blockers || to_jsonb('Superseded version must belong to the same framework'::text);
    v_issues := v_issues || jsonb_build_object('code','SUPERSESSION_INVALID','message','Superseded version must belong to the same framework','perspective_ids','[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'valid', (jsonb_array_length(v_blockers) = 0),
    'total_weight', round(v_total,3),
    'member_count', v_count,
    'weight_code', v_weight_code,
    'blockers', v_blockers,
    'passed', v_passed,
    'issues', v_issues
  );
END;
$$;
COMMENT ON FUNCTION public.strata_validate_strategy_framework_version(uuid) IS
  'Authoritative structural validator for a strategy framework version. Returns {valid,total_weight,member_count,weight_code,blockers,passed,issues}. Consumers count jsonb_array_length(blockers). Shared by UI preview, submit, approve, migration verification, tests.';

-- ---------------------------------------------------------------------------
-- G. Triggers: slug (identity only), touch updated_at, audit — mirror config-engine.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_strata_strategy_frameworks_slug
  BEFORE INSERT ON public.strata_strategy_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_strategy_frameworks','strata_strategy_framework_versions','strata_strategy_framework_members'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- H. RLS — SELECT: approved users. Identity write: strategy_office/admin.
--    Version INSERT: strategy_office/admin, draft only. Version UPDATE: creator/admin
--    while draft or changes_requested (status transitions are RPC-only, Slice 2).
--    Members write: only while parent version is draft/changes_requested, by creator/admin.
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_strategy_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_strategy_frameworks_select ON public.strata_strategy_frameworks FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_strategy_frameworks_insert ON public.strata_strategy_frameworks FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strata_admin','strategy_office']));
CREATE POLICY strata_strategy_frameworks_update ON public.strata_strategy_frameworks FOR UPDATE
  USING (public.strata_has_role(ARRAY['strata_admin','strategy_office']))
  WITH CHECK (public.strata_has_role(ARRAY['strata_admin','strategy_office']));

ALTER TABLE public.strata_strategy_framework_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_sfv_select ON public.strata_strategy_framework_versions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_sfv_insert ON public.strata_strategy_framework_versions FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strata_admin','strategy_office']) AND status = 'draft');
CREATE POLICY strata_sfv_update ON public.strata_strategy_framework_versions FOR UPDATE
  USING (status IN ('draft','changes_requested') AND (created_by = auth.uid() OR public.strata_is_admin()))
  WITH CHECK (status IN ('draft','changes_requested'));
CREATE POLICY strata_sfv_delete ON public.strata_strategy_framework_versions FOR DELETE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()));

ALTER TABLE public.strata_strategy_framework_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_sfm_select ON public.strata_strategy_framework_members FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_sfm_write ON public.strata_strategy_framework_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.strata_strategy_framework_versions v
                 WHERE v.id = framework_version_id AND v.status IN ('draft','changes_requested')
                   AND (v.created_by = auth.uid() OR public.strata_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.strata_strategy_framework_versions v
                      WHERE v.id = framework_version_id AND v.status IN ('draft','changes_requested')
                        AND (v.created_by = auth.uid() OR public.strata_is_admin())));
