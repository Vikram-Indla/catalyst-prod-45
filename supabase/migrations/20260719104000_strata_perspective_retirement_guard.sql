-- CAT-STRATA-GOVFRAMEWORK-20260719-001 — Slice 9: Perspective retirement dependency guard.
--
-- Perspectives retire through the generic strata_retire_record, which knows nothing about
-- frameworks. Without a guard, a perspective that is a LIVE member of the effective (or an open
-- draft) framework version could be retired, silently breaking the framework's 100% total. This
-- adds the DB enforcement boundary the spec requires: retirement is BLOCKED while the perspective
-- is depended on, regardless of which code path attempts it.
--
-- Scope of the block (narrow, to avoid over-blocking history):
--   - member of the effective approved framework version, OR
--   - member of any open framework draft (draft / changes_requested / pending_approval), OR
--   - used by an EDITABLE scorecard model (draft / changes_requested), OR
--   - has an active (non-retired/superseded) child perspective (unresolved hierarchy).
-- Approved/historical scorecard models and locked snapshots are NOT blockers — a retired
-- perspective stays readable on historical configurations (that is the whole point of retire vs delete).
--
-- Supersession (status → 'superseded', the perspective-revision path) is explicitly allowed.
-- Depends on Slices 1–3. Forward-only. Does NOT modify strata_retire_record or the generic whitelist.

-- Read-only impact report the UI shows before attempting retirement.
CREATE OR REPLACE FUNCTION public.strata_perspective_retirement_impact(p_perspective uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_eff int; v_draft_fw int; v_editable_model int; v_approved_model int;
  v_elements int; v_children int; v_snapshots int;
BEGIN
  SELECT COUNT(*) INTO v_eff
    FROM public.strata_strategy_framework_members m
    JOIN public.strata_strategy_framework_versions v ON v.id = m.framework_version_id
   WHERE m.perspective_id = p_perspective AND v.status = 'approved' AND v.effective_to IS NULL;

  SELECT COUNT(*) INTO v_draft_fw
    FROM public.strata_strategy_framework_members m
    JOIN public.strata_strategy_framework_versions v ON v.id = m.framework_version_id
   WHERE m.perspective_id = p_perspective AND v.status IN ('draft','changes_requested','pending_approval');

  SELECT COUNT(*) INTO v_editable_model
    FROM public.strata_scorecard_model_perspectives mp
    JOIN public.strata_scorecard_models sm ON sm.id = mp.model_id
   WHERE mp.perspective_id = p_perspective AND sm.status IN ('draft','changes_requested');

  SELECT COUNT(*) INTO v_approved_model
    FROM public.strata_scorecard_model_perspectives mp
    JOIN public.strata_scorecard_models sm ON sm.id = mp.model_id
   WHERE mp.perspective_id = p_perspective AND sm.status = 'approved';

  SELECT COUNT(*) INTO v_elements
    FROM public.strata_strategy_elements WHERE perspective_id = p_perspective;

  SELECT COUNT(*) INTO v_children
    FROM public.strata_perspectives WHERE parent_id = p_perspective AND status NOT IN ('retired','superseded');

  SELECT COUNT(*) INTO v_snapshots
    FROM public.strata_snapshot_items WHERE entity_type = 'perspective' AND entity_id = p_perspective;

  RETURN jsonb_build_object(
    'perspective_id', p_perspective,
    'effective_framework_memberships', v_eff,
    'draft_framework_memberships', v_draft_fw,
    'editable_model_uses', v_editable_model,
    'approved_model_uses', v_approved_model,      -- informational (historical), not a blocker
    'strategy_elements', v_elements,               -- informational (historical stays readable)
    'active_child_perspectives', v_children,
    'locked_snapshot_items', v_snapshots,          -- informational (frozen, never rewritten)
    'blocked', (v_eff > 0 OR v_draft_fw > 0 OR v_editable_model > 0 OR v_children > 0)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_perspective_retirement_impact(uuid) TO authenticated;

-- The enforcement boundary: block status → 'retired' while dependencies exist.
CREATE OR REPLACE FUNCTION public.strata_guard_perspective_retire()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_impact jsonb;
BEGIN
  IF NEW.status = 'retired' AND OLD.status IS DISTINCT FROM 'retired' THEN
    v_impact := public.strata_perspective_retirement_impact(NEW.id);
    IF (v_impact->>'blocked')::boolean THEN
      RAISE EXCEPTION 'cannot retire this perspective while it is in use: % effective framework, % draft framework, % editable model, % active child perspective(s). Remove it from the effective framework (approve a new framework version without it) and resolve open drafts first.',
        v_impact->>'effective_framework_memberships', v_impact->>'draft_framework_memberships',
        v_impact->>'editable_model_uses', v_impact->>'active_child_perspectives'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_strata_perspectives_retire_guard ON public.strata_perspectives;
CREATE TRIGGER trg_strata_perspectives_retire_guard
  BEFORE UPDATE ON public.strata_perspectives
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_perspective_retire();
