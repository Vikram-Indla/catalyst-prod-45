-- CAT-STRATA-SRDEF-20260717-001 — SR-DEF-003 (P1), Project Card ↔ Strategic Objective
--
-- Problem: an objective's workspace could not link or unlink a Project Card. This was
-- the ONLY genuine backend gap in SR-DEF-003 — charter-on-objective and
-- decision→objective linkage already exist server-side and were merely gated in the UI.
--
-- What already existed (20260709171000_strata_card_objective_linkage.sql):
--   * strata_project_cards.objective_element_id (nullable FK → strata_strategy_elements,
--     ON DELETE SET NULL) + idx_strata_project_cards_objective.
--   * trg_strata_validate_card_objective (BEFORE INSERT OR UPDATE) enforcing locked
--     rules 5–6: the target must be a theme-context objective, and when the card has a
--     theme the objective must belong to that same Theme.
-- What was missing: any write verb. Neither strata_create_project_card nor
-- strata_update_project_card accepts an objective parameter, and no link/unlink RPC
-- existed — so the column was readable but not settable from any surface.
--
-- Design: a dedicated link/unlink verb pair, mirroring the established
-- strata_link_element_kpi / strata_unlink_element_kpi shape rather than widening the
-- 24-arg strata_update_project_card signature (which would also drag in its
-- p_expected_updated_at concurrency contract for a single-field edge).
--
-- Guards mirror strata_update_project_card exactly: same role set, same archived-card
-- rule — linking is an edit of the card, so it may not be a weaker gate.
--
-- Audit: deliberately NOT hand-written here. strata_project_cards already carries the
-- generic trg_strata_project_cards_audit (AFTER UPDATE → strata_audit()), which records
-- actor plus before/after jsonb — so the objective_element_id transition is captured
-- exactly once, with the old and new values. Hand-writing a second row is precisely the
-- double-write corrected by SR-DEF-002 (20260718000000) and is not reintroduced here.
--
-- Source records are never deleted: unlink clears the edge only, leaving both the card
-- and the objective intact (SR-DEF-003 acceptance).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_link_card_objective(
  p_card uuid,
  p_objective uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record; obj record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'linking a project card to an objective requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_card;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'archived project cards cannot be edited'; END IF;

  SELECT id, name, element_type, context, parent_id, status
    INTO obj FROM public.strata_strategy_elements WHERE id = p_objective;
  IF obj.id IS NULL THEN RAISE EXCEPTION 'Strategic Objective not found'; END IF;
  IF obj.status = 'retired' THEN
    RAISE EXCEPTION 'cannot link to a retired Strategic Objective';
  END IF;
  -- Friendly duplicates of the trigger's rules (the trigger remains the enforcement
  -- point; these only produce a better message before the UPDATE is attempted).
  IF obj.element_type <> 'objective' OR obj.context <> 'theme' THEN
    RAISE EXCEPTION 'objective_element_id must reference a Strategic Objective (theme-context objective element)';
  END IF;
  IF pc.theme_id IS NOT NULL AND obj.parent_id IS DISTINCT FROM pc.theme_id THEN
    RAISE EXCEPTION 'linked Strategic Objective must belong to the card''s Strategic Theme';
  END IF;

  IF pc.objective_element_id = p_objective THEN
    RAISE EXCEPTION 'this Project Card is already linked to that Strategic Objective';
  END IF;

  UPDATE public.strata_project_cards
     SET objective_element_id = p_objective,
         updated_at = now()
   WHERE id = p_card;
END;
$$;

COMMENT ON FUNCTION public.strata_link_card_objective(uuid, uuid) IS
  'Links a Project Card to a Strategic Objective (locked rules 5-6; SR-DEF-003). The card keeps its Theme link; the objective must belong to that Theme. Audited once via trg_strata_project_cards_audit.';

CREATE OR REPLACE FUNCTION public.strata_unlink_card_objective(
  p_card uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'unlinking a project card from an objective requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_card;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'archived project cards cannot be edited'; END IF;
  IF pc.objective_element_id IS NULL THEN
    RAISE EXCEPTION 'this Project Card is not linked to a Strategic Objective';
  END IF;

  -- Clears the edge only. The card and the objective both survive.
  UPDATE public.strata_project_cards
     SET objective_element_id = NULL,
         updated_at = now()
   WHERE id = p_card;
END;
$$;

COMMENT ON FUNCTION public.strata_unlink_card_objective(uuid) IS
  'Clears a Project Card''s Strategic Objective link (SR-DEF-003). Deletes no source records. Audited once via trg_strata_project_cards_audit.';
