-- CAT-STRATA-RDDEF-20260718-001 · RD-DEF-001 corrective (Codex PR #356 intake finding)
--
-- The 'objective' evidence type accepted ANY strata_strategy_elements row — Codex observed
-- "J Cycle 1 Strategy Theme" offered (and storable) under the "Strategy objective" label.
-- A label must not lie about its record: 'objective' now accepts ONLY element_type='objective'
-- (canonical taxonomy: theme | play | objective | outcome | custom). Likewise 'snapshot'
-- evidence is labelled "Locked snapshot" in the UI, so an unlocked/superseded snapshot is now
-- refused at the server boundary, not just hidden by the picker.
--
-- CREATE OR REPLACE of strata_link_review only — same signature; authorization, terminal
-- immutability, ON CONFLICT uniqueness and audit behaviour unchanged. Forward-only; the
-- already-applied 20260718170000 is not rewritten. Existing stored links are historical facts
-- and are not migrated or deleted.
CREATE OR REPLACE FUNCTION public.strata_link_review(p_review uuid, p_target_type text, p_target_id uuid, p_note text DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; ok boolean; v_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'linking a review requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT status INTO v_status FROM public.strata_reviews WHERE id = p_review;
  IF v_status IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;
  IF v_status IN ('closed','cancelled') THEN
    RAISE EXCEPTION 'this review is % — its evidence references are frozen history and cannot be changed', v_status;
  END IF;

  -- RD-DEF-001 type integrity: mismatched records must not hide under misleading labels.
  IF p_target_type = 'objective' AND EXISTS (
    SELECT 1 FROM public.strata_strategy_elements e
     WHERE e.id = p_target_id AND e.element_type <> 'objective'
  ) THEN
    RAISE EXCEPTION 'that strategy element is a %, not an objective — the Strategy objective reference accepts only element_type=objective records',
      (SELECT e.element_type FROM public.strata_strategy_elements e WHERE e.id = p_target_id);
  END IF;
  IF p_target_type = 'snapshot' AND EXISTS (
    SELECT 1 FROM public.strata_snapshots s
     WHERE s.id = p_target_id AND s.status <> 'locked'
  ) THEN
    RAISE EXCEPTION 'that snapshot is % — Locked snapshot evidence accepts only locked snapshots; live or superseded numbers are not evidence',
      (SELECT s.status FROM public.strata_snapshots s WHERE s.id = p_target_id);
  END IF;

  ok := CASE p_target_type
    WHEN 'portfolio'          THEN EXISTS (SELECT 1 FROM public.strata_portfolios          WHERE id = p_target_id)
    WHEN 'benefit'            THEN EXISTS (SELECT 1 FROM public.strata_benefits            WHERE id = p_target_id)
    WHEN 'benefit_value'      THEN EXISTS (SELECT 1 FROM public.strata_benefit_values      WHERE id = p_target_id)
    WHEN 'gate_instance'      THEN EXISTS (SELECT 1 FROM public.strata_gate_instances      WHERE id = p_target_id)
    WHEN 'objective'          THEN EXISTS (SELECT 1 FROM public.strata_strategy_elements   WHERE id = p_target_id AND element_type = 'objective')
    WHEN 'kpi'                THEN EXISTS (SELECT 1 FROM public.strata_kpis                WHERE id = p_target_id)
    WHEN 'okr'                THEN EXISTS (SELECT 1 FROM public.strata_okrs                WHERE id = p_target_id)
    WHEN 'scorecard_instance' THEN EXISTS (SELECT 1 FROM public.strata_scorecard_instances WHERE id = p_target_id)
    WHEN 'project_card'       THEN EXISTS (SELECT 1 FROM public.strata_project_cards       WHERE id = p_target_id)
    WHEN 'snapshot'           THEN EXISTS (SELECT 1 FROM public.strata_snapshots           WHERE id = p_target_id AND status = 'locked')
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'referenced % not found (governed reference required, never a free-text id)', p_target_type; END IF;

  INSERT INTO public.strata_review_links (review_id, target_type, target_id, note)
  VALUES (p_review, p_target_type, p_target_id, NULLIF(btrim(p_note), ''))
  ON CONFLICT (review_id, target_type, target_id) DO UPDATE SET note = COALESCE(EXCLUDED.note, strata_review_links.note)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:link_review', auth.uid(), format('linked %s %s', p_target_type, p_target_id));
  RETURN new_id;
END;
$$;
