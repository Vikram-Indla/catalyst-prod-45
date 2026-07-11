-- CAT-STRATA-CLOSEOUT-20260710-001 · W2 — executive_viewer becomes truly read-only
--
-- The role's definition of record (20260705100000 line 67) is:
--     'executive_viewer',   -- CEO/CXO consumption; no data edits
-- yet six write paths granted it edits. This migration removes executive_viewer
-- from every write grant, aligning enforcement with the definition:
--   1. RLS strata_decisions_insert            (20260705100400)
--   2. RLS strata_ai_review                   (20260705100400)
--   3. RPC strata_create_decision             (20260705190000)
--   4. RPC strata_update_decision             (20260705190000)
--   5. RPC strata_create_action               (20260705190000)
--   6. RPC strata_update_action               (20260705190000)
-- Function bodies are verbatim copies of 20260705190000 with ONLY the role array
-- and its error message changed. strata_is_admin() bypass inside strata_has_role
-- is unchanged — admins retain full access. SELECT policies untouched.

-- 1. Decisions INSERT policy ---------------------------------------------------
DROP POLICY IF EXISTS strata_decisions_insert ON public.strata_decisions;
CREATE POLICY strata_decisions_insert ON public.strata_decisions FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator']) AND created_by = auth.uid());

-- 2. AI advisory review policy -------------------------------------------------
DROP POLICY IF EXISTS strata_ai_review ON public.strata_ai_outputs;
CREATE POLICY strata_ai_review ON public.strata_ai_outputs FOR UPDATE
  USING (public.strata_has_role(ARRAY['strategy_office']) AND created_by <> auth.uid())
  WITH CHECK (reviewed_by = auth.uid());

-- 3. strata_create_decision ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_decision(
  p_title text,
  p_decision_type text DEFAULT 'governance',
  p_forum text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_snapshot uuid DEFAULT NULL,
  p_evidence_refs jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; dkey text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a decision requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'decision title is required'; END IF;
  IF p_decision_type NOT IN ('governance','gate','escalation','action_only') THEN
    RAISE EXCEPTION 'decision type must be governance | gate | escalation | action_only';
  END IF;
  IF p_snapshot IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_snapshots WHERE id = p_snapshot) THEN
    RAISE EXCEPTION 'snapshot not found';
  END IF;

  dkey := 'DEC-' || nextval('public.strata_decision_key_seq');
  INSERT INTO public.strata_decisions
    (decision_key, forum, snapshot_id, decision_type, title, description,
     owner_id, due_date, status, evidence_refs, created_by)
  VALUES
    (dkey, p_forum, p_snapshot, p_decision_type, btrim(p_title), p_description,
     p_owner, p_due_date, 'open', p_evidence_refs, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', new_id, 'RPC:create_decision', auth.uid(),
          format('%s "%s" opened%s', dkey, btrim(p_title),
                 COALESCE(' in ' || p_forum, '')));
  RETURN new_id;
END;
$$;

-- 4. strata_update_decision ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_update_decision(
  p_decision uuid,
  p_status text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a decision requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO d FROM public.strata_decisions WHERE id = p_decision;
  IF d IS NULL THEN RAISE EXCEPTION 'decision not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','decided','closed') THEN
    RAISE EXCEPTION 'status must be open | decided | closed';
  END IF;
  IF p_status = 'closed' AND EXISTS (
    SELECT 1 FROM public.strata_actions WHERE decision_id = p_decision AND status IN ('open','in_progress')
  ) THEN
    RAISE EXCEPTION 'decision has open actions; close or cancel them first';
  END IF;

  UPDATE public.strata_decisions
     SET status = COALESCE(p_status, status),
         description = COALESCE(p_description, description),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         decided_by = CASE WHEN p_status IN ('decided','closed') AND decided_by IS NULL THEN auth.uid() ELSE decided_by END,
         decided_at = CASE WHEN p_status IN ('decided','closed') AND decided_at IS NULL THEN now() ELSE decided_at END,
         updated_at = now()
   WHERE id = p_decision;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', p_decision, 'RPC:update_decision', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status %s → %s', d.status, p_status) ELSE 'updated' END);
END;
$$;

-- 5. strata_create_action --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_action(
  p_decision uuid,
  p_title text,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; akey text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating an action requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_decisions WHERE id = p_decision) THEN
    RAISE EXCEPTION 'decision not found';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'action title is required'; END IF;

  akey := 'ACT-' || nextval('public.strata_action_key_seq');
  INSERT INTO public.strata_actions (action_key, decision_id, title, owner_id, due_date, status, note, created_by)
  VALUES (akey, p_decision, btrim(p_title), p_owner, p_due_date, 'open', p_note, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', new_id, 'RPC:create_action', auth.uid(),
          format('%s "%s" under %s', akey, btrim(p_title), public.strata_entity_name('decision', p_decision)));
  RETURN new_id;
END;
$$;

-- 6. strata_update_action --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_update_action(
  p_action uuid,
  p_status text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating an action requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO a FROM public.strata_actions WHERE id = p_action;
  IF a IS NULL THEN RAISE EXCEPTION 'action not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','in_progress','done','cancelled') THEN
    RAISE EXCEPTION 'status must be open | in_progress | done | cancelled';
  END IF;

  UPDATE public.strata_actions
     SET status = COALESCE(p_status, status),
         note = COALESCE(p_note, note),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         updated_at = now()
   WHERE id = p_action;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', p_action, 'RPC:update_action', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status %s → %s', a.status, p_status) ELSE 'updated' END);
END;
$$;
