-- ============================================================================
-- STRATA — DEMO SEED EXTENSION: canonical chain closure (REQ-020)
-- CAT-STRATA-FOUNDATION-20260709-001 · Demonstrates every locked linkage
-- rule end-to-end on the Salam reference tenant:
--   Cycle → Theme → Objective → OKR/KR → Project Card
--   (+ card→objective edge, Project Objective, Project KPI rollup)
--   → Portfolio membership → Benefits → Gates → Snapshot → Decision → Action
-- The base chain ships in 20260705100600; this extension adds the pieces
-- introduced by the foundation build: objective_element_id (rule 5/6) and a
-- Project Objective / Project KPI pair with upward edges (rules 7–10).
-- Idempotent: guarded per-statement; skips if the demo cycle is absent.
-- Inserts mirror the RPC write paths (strata_create_project_objective /
-- strata_create_project_kpi) because SECURITY-DEFINER role checks do not
-- apply inside migrations.
-- ============================================================================

DO $seed$
DECLARE
  demo_cycle uuid := 'a5a1a000-0000-4000-8000-000000001001';
  care_card  uuid := 'a5a1a000-0000-4000-8000-000000001613'; -- Care App v3
  proj_obj   uuid := 'a5a1a000-0000-4000-8000-000000001911';
  proj_kpi   uuid := 'a5a1a000-0000-4000-8000-000000001912';
  parent_objective uuid;
  parent_theme_kpi uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = demo_cycle) THEN
    RAISE NOTICE 'STRATA demo cycle absent — canonical-chain seed skipped';
    RETURN;
  END IF;

  -- 1. Rule 5/6: link each demo card to a Strategic Objective under its
  --    own Theme (trigger strata_validate_card_objective enforces fit).
  UPDATE public.strata_project_cards pc
     SET objective_element_id = (
       SELECT e.id FROM public.strata_strategy_elements e
        WHERE e.element_type = 'objective' AND e.context = 'theme'
          AND e.parent_id = pc.theme_id
        ORDER BY e.order_index LIMIT 1)
   WHERE pc.id::text LIKE 'a5a1a000-%'
     AND pc.objective_element_id IS NULL
     AND pc.theme_id IS NOT NULL;

  -- 2. Rules 7–8: a Project Objective inside Care App v3, parented to the
  --    Strategic Objective it supports.
  SELECT objective_element_id INTO parent_objective
    FROM public.strata_project_cards WHERE id = care_card;

  IF parent_objective IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = proj_obj) THEN
    INSERT INTO public.strata_strategy_elements
      (id, cycle_id, element_type, context, name, slug, description, parent_id, stage, status, order_index)
    VALUES
      (proj_obj, demo_cycle, 'objective', 'project',
       'Lift digital care adoption to 60%', 'lift-digital-care-adoption',
       'Care App v3 outcome objective supporting the strategic objective (DEMO SEED).',
       parent_objective, 'active', 'active', 0);

    INSERT INTO public.strata_execution_links
      (from_type, from_id, to_type, to_id, relationship_type)
    VALUES ('project_card', care_card, 'element', proj_obj, 'has_objective')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Rules 9–10: a Project KPI measured on the card, rolling up to a
  --    Theme KPI already linked to the parent objective (data-derived).
  SELECT ek.kpi_id INTO parent_theme_kpi
    FROM public.strata_element_kpis ek
   WHERE ek.element_id = parent_objective
   LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = proj_kpi) THEN
    INSERT INTO public.strata_kpis
      (id, name, unit, direction, frequency, entry_method, status)
    VALUES
      (proj_kpi, 'Care App MAU penetration', '%', 'higher_better', 'monthly', 'manual', 'approved');

    INSERT INTO public.strata_execution_links
      (from_type, from_id, to_type, to_id, relationship_type)
    VALUES ('project_card', care_card, 'kpi', proj_kpi, 'measures')
    ON CONFLICT DO NOTHING;

    IF parent_theme_kpi IS NOT NULL THEN
      INSERT INTO public.strata_execution_links
        (from_type, from_id, to_type, to_id, relationship_type)
      VALUES ('kpi', proj_kpi, 'kpi', parent_theme_kpi, 'rolls_up_to')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RAISE NOTICE 'STRATA canonical-chain seed extension applied';
END;
$seed$;

-- Verification queries (one per linkage rule closed here — run post-apply):
--   rule 5/6: SELECT name, objective_element_id FROM strata_project_cards WHERE id::text LIKE 'a5a1a000-%';
--   rule 7/8: SELECT e.name, e.parent_id FROM strata_strategy_elements e WHERE e.context='project';
--   rule 9/10: SELECT * FROM strata_execution_links WHERE relationship_type IN ('measures','rolls_up_to');
