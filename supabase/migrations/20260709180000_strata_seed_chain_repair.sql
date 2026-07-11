-- CAT-STRATA-FOUNDATION-20260709-001 · REQ-020 repair (drift D-BUILD-002)
-- 20260709172000's rule-5/6 UPDATE was a no-op on the reference tenant: the
-- four demo Project Cards carry theme_id = the ROOT theme (Digital Market
-- Leadership), while every theme-context Strategic Objective is parented to
-- its child themes (B2B Growth Engine, Network Excellence). Rule 6 requires
-- the linked objective to belong to the card's own Theme, so nothing linked
-- and the Care App v3 project-objective step was skipped.
-- Repair: move the demo cards down to their objective-bearing sub-themes
-- (locked hierarchy places Project Cards under the Strategic Objective level
-- of a Theme, not on a root grouping theme), then re-run the idempotent
-- chain closure from 20260709172000 verbatim.

DO $repair$
DECLARE
  demo_cycle uuid := 'a5a1a000-0000-4000-8000-000000001001';
  b2b_theme  uuid := 'a5a1a000-0000-4000-8000-000000001102'; -- B2B Growth Engine
  net_theme  uuid := 'a5a1a000-0000-4000-8000-000000001103'; -- Network Excellence
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = demo_cycle) THEN
    RAISE NOTICE 'STRATA demo cycle absent — chain repair skipped';
    RETURN;
  END IF;

  -- Reassign demo cards to the sub-theme that owns their supporting objective.
  UPDATE public.strata_project_cards SET theme_id = net_theme
   WHERE id = 'a5a1a000-0000-4000-8000-000000001612' AND theme_id <> net_theme; -- 5G Rollout Wave 2
  UPDATE public.strata_project_cards SET theme_id = b2b_theme
   WHERE id IN ('a5a1a000-0000-4000-8000-000000001611',  -- CPQ & Sales Enablement
                'a5a1a000-0000-4000-8000-000000001613',  -- Care App v3
                'a5a1a000-0000-4000-8000-000000001614')  -- Enterprise Care Desk
     AND theme_id <> b2b_theme;
END;
$repair$;

-- Re-run the canonical chain closure (idempotent, identical to 20260709172000).
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
    RETURN;
  END IF;

  UPDATE public.strata_project_cards pc
     SET objective_element_id = (
       SELECT e.id FROM public.strata_strategy_elements e
        WHERE e.element_type = 'objective' AND e.context = 'theme'
          AND e.parent_id = pc.theme_id
        ORDER BY e.order_index LIMIT 1)
   WHERE pc.id::text LIKE 'a5a1a000-%'
     AND pc.objective_element_id IS NULL
     AND pc.theme_id IS NOT NULL;

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

  SELECT ek.kpi_id INTO parent_theme_kpi
    FROM public.strata_element_kpis ek
   WHERE ek.element_id = parent_objective
   LIMIT 1;

  -- proj_kpi already exists from 20260709172000; close the missing edges only.
  IF EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = proj_kpi) THEN
    INSERT INTO public.strata_execution_links
      (from_type, from_id, to_type, to_id, relationship_type)
    VALUES ('project_card', care_card, 'kpi', proj_kpi, 'measures')
    ON CONFLICT DO NOTHING;

    IF parent_theme_kpi IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.strata_execution_links
       WHERE from_type='kpi' AND from_id=proj_kpi AND relationship_type='rolls_up_to'
    ) THEN
      INSERT INTO public.strata_execution_links
        (from_type, from_id, to_type, to_id, relationship_type)
      VALUES ('kpi', proj_kpi, 'kpi', parent_theme_kpi, 'rolls_up_to')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RAISE NOTICE 'STRATA canonical-chain repair applied';
END;
$seed$;

-- Post-apply verification (rule numbers = locked linkage rules):
--   rule 5/6: SELECT name, theme_id, objective_element_id FROM strata_project_cards WHERE id::text LIKE 'a5a1a000-%';
--   rule 7/8: SELECT name, parent_id FROM strata_strategy_elements WHERE context='project' AND id::text LIKE 'a5a1a000-%';
--   rule 9/10: SELECT * FROM strata_execution_links WHERE from_id::text LIKE 'a5a1a000-%' AND relationship_type IN ('measures','rolls_up_to');
