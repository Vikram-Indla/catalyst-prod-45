-- CAT-STRATA-THEME-DETAIL-20260710-001 Slice 4 — Theme-scoped governance.
-- Additive-only: new nullable FK, new optional RPC parameter appended last.
-- strata_actions is untouched — actions inherit Theme scope transitively
-- via their parent decision's element_id (decision_id already required).

ALTER TABLE public.strata_decisions
  ADD COLUMN IF NOT EXISTS element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_strata_decisions_element
  ON public.strata_decisions(element_id) WHERE element_id IS NOT NULL;

-- Postgres treats a changed argument list as a new overload, not a replace —
-- drop the old 8-arg signature first so only the 9-arg version survives
-- (otherwise PostgREST/supabase-js RPC calls that omit p_element become
-- ambiguous between the two overloads, breaking StrataReviewsPage.tsx's
-- existing call site).
DROP FUNCTION IF EXISTS public.strata_create_decision(text, text, text, text, uuid, date, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.strata_create_decision(
  p_title text,
  p_decision_type text DEFAULT 'governance',
  p_forum text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_snapshot uuid DEFAULT NULL,
  p_evidence_refs jsonb DEFAULT NULL,
  p_element uuid DEFAULT NULL
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
  IF p_element IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element) THEN
    RAISE EXCEPTION 'strategy element not found';
  END IF;

  dkey := 'DEC-' || nextval('public.strata_decision_key_seq');
  INSERT INTO public.strata_decisions
    (decision_key, forum, snapshot_id, decision_type, title, description,
     owner_id, due_date, status, evidence_refs, created_by, element_id)
  VALUES
    (dkey, p_forum, p_snapshot, p_decision_type, btrim(p_title), p_description,
     p_owner, p_due_date, 'open', p_evidence_refs, auth.uid(), p_element)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', new_id, 'RPC:create_decision', auth.uid(),
          format('%s "%s" opened%s', dkey, btrim(p_title),
                 COALESCE(' in ' || p_forum, '')));
  RETURN new_id;
END;
$$;
