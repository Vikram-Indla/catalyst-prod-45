-- CAT-STRATA-V6QA-20260712-001 — Wave 4 · V6-OPEN-032
--
-- Two defects in strata_promote_element:
--
-- 1. No ancestor-status gate. The function checked the element's OWN prerequisites
--    but never inspected its parent chain, so a child (Strategic Objective or
--    Project Objective) could be promoted to Active while its Theme/Objective
--    ancestors were still Draft — a contradictory hierarchy. Fix: walk parent_id
--    up and reject promotion while any ancestor is not Active, naming each.
--
-- 2. Theme promotion is structurally impossible. Migration 20260710170000
--    (gate-scope correction) descoped Value Gates from strategy elements — it
--    deleted every strata_gate_instances row with subject_type='element' and made
--    strata_schedule_gate reject element gates. But strata_promote_element still
--    required gate_count>0 for element_type='theme', so gate_count is now
--    permanently 0 for every Theme and promotion ALWAYS fails on "missing gate
--    schedule", regardless of charter completeness. Fix: drop the gate requirement
--    for Themes (reconciling with CAT-STRATA-GATE-SCOPE-20260710-001). Themes still
--    require owner + complete charter + >=1 linked KPI.
--
-- NOT changed here (logged as a decision, not silently picked): whether Project
-- Objectives should carry their own charter/KPI gate. Today objectives get only an
-- owner check; the new ancestor gate already gives them transitive governance
-- (they cannot go Active until their Theme — which needs charter+KPI — is Active).
--
-- Same signature — CREATE OR REPLACE only. Unapplied (D-1). Rollback = re-apply
-- 20260706230000.

CREATE OR REPLACE FUNCTION public.strata_promote_element(p_element uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  el record; charter record; kpi_count int;
  missing text[] := '{}';
  blocked_ancestors text[] := '{}';
  anc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'promotion to active governance requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'active' THEN RAISE EXCEPTION 'element is already active'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot be promoted'; END IF;

  -- V6-OPEN-032: a child cannot be Active while any ancestor is not yet Active.
  FOR anc IN
    WITH RECURSIVE ancestors AS (
      SELECT p.id, p.name, p.status, p.parent_id
        FROM public.strata_strategy_elements p
       WHERE p.id = el.parent_id
      UNION ALL
      SELECT p.id, p.name, p.status, p.parent_id
        FROM public.strata_strategy_elements p
        JOIN ancestors a ON p.id = a.parent_id
    )
    SELECT name, status FROM ancestors WHERE status <> 'active'
  LOOP
    blocked_ancestors := array_append(blocked_ancestors, format('%s (%s)', anc.name, anc.status));
  END LOOP;
  IF array_length(blocked_ancestors, 1) > 0 THEN
    RAISE EXCEPTION 'promotion blocked — these ancestors must be Active first: %',
      array_to_string(blocked_ancestors, '; ');
  END IF;

  IF el.owner_id IS NULL THEN missing := array_append(missing, 'accountable owner'); END IF;

  IF el.element_type = 'theme' THEN
    SELECT * INTO charter FROM public.strata_play_charters WHERE element_id = p_element;
    IF charter IS NULL THEN
      missing := array_append(missing, 'charter');
      missing := array_append(missing, 'value hypothesis (charter value thesis)');
    ELSE
      IF charter.hypothesis IS NULL OR btrim(charter.hypothesis) = '' THEN missing := array_append(missing, 'charter hypothesis'); END IF;
      IF charter.scope IS NULL OR btrim(charter.scope) = '' THEN missing := array_append(missing, 'charter scope'); END IF;
      IF charter.value_thesis IS NULL OR btrim(charter.value_thesis) = '' THEN missing := array_append(missing, 'value hypothesis (charter value thesis)'); END IF;
      IF charter.owner_id IS NULL THEN missing := array_append(missing, 'charter owner'); END IF;
    END IF;
    -- Value Gates are no longer schedulable against elements (20260710170000);
    -- the gate-schedule prerequisite is intentionally removed here.
    SELECT count(*) INTO kpi_count FROM public.strata_element_kpis WHERE element_id = p_element;
    IF kpi_count = 0 THEN missing := array_append(missing, 'linked KPI set (at least one KPI)'); END IF;
  END IF;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'promotion blocked — missing: %', array_to_string(missing, '; ');
  END IF;

  UPDATE public.strata_strategy_elements SET status = 'active', updated_at = now() WHERE id = p_element;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:promote_element', auth.uid(),
          'promoted to active governance (ancestors active + owner + charter + value hypothesis + KPI set verified)');
END;
$$;

COMMENT ON FUNCTION public.strata_promote_element(uuid) IS
  'Server-side promotion guard (F-STR-008; V6-OPEN-032): rejects promotion while any ancestor is non-active, then aggregates all missing own-prerequisites. Theme requires owner + charter + >=1 KPI (gate requirement removed per CAT-STRATA-GATE-SCOPE-20260710-001).';

-- ---------------------------------------------------------------------------
-- V6-OPEN-032 data reconciliation. Existing rows that violate the new invariant
-- (an Active element under a non-Active ancestor) are demoted back to Draft — the
-- guard above would have blocked them. Recursive so an entire invalid subtree is
-- corrected in one pass; reports the count via NOTICE. Idempotent (a second run
-- finds nothing). No genuine data is guessed — the invariant is deterministic:
-- a child cannot be Active while any ancestor is not.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    WITH RECURSIVE bad AS (
      SELECT c.id, c.name
        FROM public.strata_strategy_elements c
        JOIN public.strata_strategy_elements p ON p.id = c.parent_id
       WHERE c.status = 'active' AND p.status <> 'active'
      UNION
      SELECT c.id, c.name
        FROM public.strata_strategy_elements c
        JOIN bad b ON c.parent_id = b.id
       WHERE c.status = 'active'
    )
    SELECT id, name FROM bad
  LOOP
    UPDATE public.strata_strategy_elements
       SET status = 'draft', updated_at = now()
     WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'V6-OPEN-032 reconciliation: demoted % active element(s) that sat under a non-active ancestor back to draft.', n;
END;
$$;
