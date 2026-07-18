-- =============================================================================
-- PC-DEF-001 / PC-DEF-003 / PC-DEF-005 — Governed Project Card lifecycle
-- Feature: CAT-STRATA-PCDEF-20260717-001
--
-- PC-DEF-001 — Strategic alignment governance
--   A project could advance/operate with a Strategic Theme only and no primary
--   Strategic Objective. `objective_element_id` (a single theme-context
--   objective, validated by trg_strata_validate_card_objective) IS the primary
--   objective. We now REQUIRE it before a card advances beyond planning. No
--   history is fabricated: Theme-only cards simply cannot advance until aligned.
--
-- PC-DEF-003 — Completion governance
--   Planning could go straight to Completed via the generic edit form's Delivery
--   Status picklist, with no objective/owner/PM/dates/milestones/open-threat/
--   reason/approval. Direct terminal transitions are now blocked; completion
--   runs through strata_complete_project_card, which enforces prerequisites +
--   separation of duties + reason + actor + audit.
--
-- PC-DEF-005 — Governed lifecycle surfaces
--   Adds a governed cancellation verb (+ a 'cancelled' delivery_status value),
--   a governed benefit↔project-card linkage verb (reversible relationship), and
--   closes the terminal-immutability gap on the card row itself.
--
-- Mechanism: a BEFORE UPDATE trigger on strata_project_cards enforces the stage
-- rules centrally (so every write path is covered), and terminal transitions are
-- gated by a transaction-local GUC that only the governed verbs set. This avoids
-- redefining the large update RPC and cannot loosen any existing control.
-- =============================================================================

-- 0. New governed terminal state: 'cancelled' (distinct from archive) ----------
INSERT INTO public.strata_project_card_picklists (picklist_key, value, label, position)
VALUES ('delivery_status', 'cancelled', 'Cancelled', 6)
ON CONFLICT (picklist_key, value) DO NOTHING;

-- 1. Central stage-governance trigger -----------------------------------------
CREATE OR REPLACE FUNCTION public.strata_guard_card_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- (a) Terminal immutability: an already-terminal card is frozen. Corrections
  --     must be prospective or explicitly superseding (no reopen verb exists).
  IF OLD.stage IN ('completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION
      'project card % is in terminal state "%" and is immutable; corrections must be prospective or explicitly superseding',
      COALESCE(OLD.reference_id, OLD.id::text), OLD.stage
      USING ERRCODE = 'check_violation';
  END IF;

  -- (b) Stage transitions only.
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    -- Governed terminal transitions must come through the governed verbs, which
    -- set a transaction-local marker. Blocks the direct edit-form path.
    IF NEW.stage IN ('completed', 'cancelled')
       AND current_setting('strata.governed_transition', true) IS DISTINCT FROM NEW.stage THEN
      RAISE EXCEPTION
        'transition to "%" must use the governed verb (strata_complete_project_card / strata_cancel_project_card), not a direct status edit',
        NEW.stage
        USING ERRCODE = 'check_violation';
    END IF;

    -- PC-DEF-001: a primary Strategic Objective is required to advance a project
    -- into active delivery (or completion). Theme-only cards stay in planning.
    IF NEW.stage IN ('active', 'delivery', 'completed')
       AND NEW.objective_element_id IS NULL THEN
      RAISE EXCEPTION
        'a primary Strategic Objective is required before this project can advance beyond planning (PC-DEF-001); link one via strata_link_card_objective'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.strata_guard_card_stage() IS
  'PC-DEF-001/003/004/005: central Project Card stage governance — freezes terminal cards, forces completed/cancelled transitions through the governed verbs, and requires a primary Strategic Objective before a card advances beyond planning.';

DROP TRIGGER IF EXISTS trg_strata_guard_card_stage ON public.strata_project_cards;
CREATE TRIGGER trg_strata_guard_card_stage
  BEFORE UPDATE ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_card_stage();

-- 2. PC-DEF-003 — governed completion with prerequisites + SoD ----------------
CREATE OR REPLACE FUNCTION public.strata_complete_project_card(
  p_project uuid,
  p_reason  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc            record;
  open_ms       int;
  total_ms      int;
  open_threats  int;
  open_blockers int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'completing a project card requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a completion reason is required';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage IN ('completed','cancelled','archived') THEN
    RAISE EXCEPTION 'project card is already in terminal state "%"', pc.stage;
  END IF;

  -- Separation of duties: the completer cannot be the card's creator.
  IF pc.created_by IS NOT NULL AND pc.created_by = auth.uid() THEN
    RAISE EXCEPTION 'separation of duties: the project creator cannot complete their own project';
  END IF;

  -- Alignment (PC-DEF-001).
  IF pc.objective_element_id IS NULL THEN
    RAISE EXCEPTION 'closure blocked: a primary Strategic Objective must be linked before completion';
  END IF;

  -- Ownership.
  IF pc.business_owner_id IS NULL OR pc.pm_id IS NULL THEN
    RAISE EXCEPTION 'closure blocked: a Business Owner and a Project Manager must be assigned before completion';
  END IF;

  -- Delivery conditions: baselined and no unfinished milestones.
  IF pc.baseline_start IS NULL OR pc.baseline_end IS NULL THEN
    RAISE EXCEPTION 'closure blocked: baseline start and end dates are required before completion';
  END IF;
  SELECT count(*) FILTER (WHERE status IN ('planned','in_progress')), count(*)
    INTO open_ms, total_ms
    FROM public.strata_milestones WHERE project_card_id = p_project;
  IF total_ms = 0 THEN
    RAISE EXCEPTION 'closure blocked: at least one milestone is required as delivery evidence before completion';
  END IF;
  IF open_ms > 0 THEN
    RAISE EXCEPTION 'closure blocked: % milestone(s) are still open (planned/in progress) — resolve or descope them first', open_ms;
  END IF;

  -- Open-threat handling: no live risks, no open blocking dependencies.
  SELECT count(*) INTO open_threats
    FROM public.strata_risks
   WHERE project_card_id = p_project AND status IN ('open','mitigating');
  IF open_threats > 0 THEN
    RAISE EXCEPTION 'closure blocked: % open risk(s) must be accepted or closed before completion', open_threats;
  END IF;
  SELECT count(*) INTO open_blockers
    FROM public.strata_dependencies
   WHERE requesting_type = 'project_card' AND requesting_id = p_project
     AND is_blocker = true AND status IN ('open','at_risk','blocked');
  IF open_blockers > 0 THEN
    RAISE EXCEPTION 'closure blocked: % open blocking dependency(ies) must be resolved before completion', open_blockers;
  END IF;

  -- Final progress recompute while still non-terminal.
  PERFORM public.strata_calc_execution_progress(p_project);

  -- Governed transition marker for the stage guard, then the single terminal write.
  PERFORM set_config('strata.governed_transition', 'completed', true);
  UPDATE public.strata_project_cards
     SET stage = 'completed',
         optional_fields = COALESCE(optional_fields, '{}'::jsonb) || jsonb_build_object(
           'closure', jsonb_build_object(
             'type', 'completed', 'reason', btrim(p_reason),
             'actor', auth.uid(), 'at', now())),
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_project_cards', p_project, 'RPC:complete_project_card', auth.uid(),
          jsonb_build_object('stage', pc.stage),
          jsonb_build_object('stage', 'completed'),
          'completed: ' || btrim(p_reason));
END;
$$;

COMMENT ON FUNCTION public.strata_complete_project_card(uuid,text) IS
  'PC-DEF-003: governed completion. Enforces alignment (primary objective), ownership (business owner + PM), baselined dates, all milestones resolved, no open risks/blocking dependencies, separation of duties (completer <> creator), a reason, actor and audit before setting stage=completed.';

GRANT EXECUTE ON FUNCTION public.strata_complete_project_card(uuid,text) TO authenticated;

-- 3. PC-DEF-005 — governed cancellation (abandonment) -------------------------
CREATE OR REPLACE FUNCTION public.strata_cancel_project_card(
  p_project uuid,
  p_reason  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'cancelling a project card requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a cancellation reason is required';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage IN ('completed','cancelled','archived') THEN
    RAISE EXCEPTION 'project card is already in terminal state "%"', pc.stage;
  END IF;

  PERFORM set_config('strata.governed_transition', 'cancelled', true);
  UPDATE public.strata_project_cards
     SET stage = 'cancelled',
         optional_fields = COALESCE(optional_fields, '{}'::jsonb) || jsonb_build_object(
           'closure', jsonb_build_object(
             'type', 'cancelled', 'reason', btrim(p_reason),
             'actor', auth.uid(), 'at', now())),
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_project_cards', p_project, 'RPC:cancel_project_card', auth.uid(),
          jsonb_build_object('stage', pc.stage),
          jsonb_build_object('stage', 'cancelled'),
          'cancelled: ' || btrim(p_reason));
END;
$$;

COMMENT ON FUNCTION public.strata_cancel_project_card(uuid,text) IS
  'PC-DEF-005: governed cancellation of an abandoned project. Requires a reason, actor and audit; sets stage=cancelled and freezes the card (terminal). Distinct from archive.';

GRANT EXECUTE ON FUNCTION public.strata_cancel_project_card(uuid,text) TO authenticated;

-- 4. PC-DEF-005 — governed benefit ↔ project-card linkage (reversible) --------
CREATE OR REPLACE FUNCTION public.strata_link_benefit_project_card(
  p_benefit uuid,
  p_project uuid,
  p_attribution_share numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'linking a benefit to a project requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_benefits WHERE id = p_benefit) THEN
    RAISE EXCEPTION 'benefit not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;
  IF p_attribution_share IS NOT NULL AND (p_attribution_share < 0 OR p_attribution_share > 100) THEN
    RAISE EXCEPTION 'attribution share must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_benefit_project_cards
              WHERE benefit_id = p_benefit AND project_card_id = p_project) THEN
    RAISE EXCEPTION 'this benefit is already linked to the project card';
  END IF;

  INSERT INTO public.strata_benefit_project_cards (benefit_id, project_card_id, attribution_share)
  VALUES (p_benefit, p_project, p_attribution_share)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_project_cards', new_id, 'RPC:link_benefit_project_card', auth.uid(),
          format('benefit "%s" linked to %s', public.strata_entity_name('benefit', p_benefit),
                 public.strata_entity_name('project_card', p_project)));
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_link_benefit_project_card(uuid,uuid,numeric) IS
  'PC-DEF-005: governed, reversible benefit↔project-card linkage with optional attribution share. Does not alter benefit definitions or realized values.';

GRANT EXECUTE ON FUNCTION public.strata_link_benefit_project_card(uuid,uuid,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_unlink_benefit_project_card(
  p_benefit uuid,
  p_project uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'unlinking a benefit requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_benefit_project_cards
   WHERE benefit_id = p_benefit AND project_card_id = p_project;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_project_cards', p_project, 'RPC:unlink_benefit_project_card', auth.uid(),
          format('benefit unlinked from %s', public.strata_entity_name('project_card', p_project)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.strata_unlink_benefit_project_card(uuid,uuid) TO authenticated;
