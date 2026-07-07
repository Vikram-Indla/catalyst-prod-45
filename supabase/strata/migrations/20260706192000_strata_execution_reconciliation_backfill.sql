-- ============================================================================
-- STRATA Execution reconciliation — data backfill (no destructive loss).
-- CAT-STRATA-EXECUTION-RECONCILE-20260706 · Execution Reconciliation Report §L
--
-- 1. Backfill strata_project_cards.theme_id from the existing
--    Initiative -> strategy_element -> Project Card chain. Only backfills
--    when a project card resolves to EXACTLY ONE initiative and EXACTLY ONE
--    theme — ambiguous or unmapped cases are left NULL and logged as a
--    strata_audit_events warning row (queryable evidence, never guessed).
-- 2. Migrates the Initiative's business-context fields (sponsor_id,
--    budget_envelope -> budget, business_case, value_hypothesis) onto the
--    Project Card as optional/config-gated fields — only into fields that
--    are currently NULL on the card (never overwrites card-authored data).
-- Nothing is deleted. strata_initiatives and its links are untouched.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.strata_theme_for_element(p_element uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id, element_type FROM public.strata_strategy_elements WHERE id = p_element
    UNION ALL
    SELECT se.id, se.parent_id, se.element_type
      FROM public.strata_strategy_elements se JOIN up ON se.id = up.parent_id
  )
  SELECT id FROM up WHERE element_type = 'theme' LIMIT 1;
$$;

COMMENT ON FUNCTION public.strata_theme_for_element(uuid) IS
  'Walks parent_id upward from any strategy element to its containing Theme (element_type=theme). Returns NULL if none found. Used by the Execution reconciliation backfill and available for future theme-resolution needs.';

DO $backfill$
DECLARE
  pc record;
  ini_ids uuid[];
  ini_id uuid;
  theme_ids uuid[];
  resolved_theme uuid;
  ini record;
BEGIN
  FOR pc IN SELECT * FROM public.strata_project_cards LOOP
    SELECT array_agg(DISTINCT initiative_id) INTO ini_ids
      FROM public.strata_initiative_projects WHERE project_card_id = pc.id;

    IF ini_ids IS NULL OR array_length(ini_ids, 1) IS NULL THEN
      CONTINUE; -- no Initiative history at all — nothing to backfill, not an error
    END IF;

    IF array_length(ini_ids, 1) > 1 THEN
      INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
      VALUES ('strata_project_cards', pc.id, 'BACKFILL:theme_from_initiative_skipped', NULL,
              format('skipped — project card is linked to %s initiatives (ambiguous), theme_id left NULL for manual resolution', array_length(ini_ids, 1)));
      CONTINUE;
    END IF;

    ini_id := ini_ids[1];

    SELECT array_agg(DISTINCT public.strata_theme_for_element(ie.element_id)) INTO theme_ids
      FROM public.strata_initiative_elements ie WHERE ie.initiative_id = ini_id;
    theme_ids := array_remove(theme_ids, NULL);

    IF theme_ids IS NULL OR array_length(theme_ids, 1) IS NULL THEN
      INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
      VALUES ('strata_project_cards', pc.id, 'BACKFILL:theme_from_initiative_skipped', NULL,
              format('skipped — initiative "%s" has no resolvable Theme ancestor, theme_id left NULL for manual resolution', public.strata_entity_name('initiative', ini_id)));
      CONTINUE;
    END IF;

    IF array_length(theme_ids, 1) > 1 THEN
      INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
      VALUES ('strata_project_cards', pc.id, 'BACKFILL:theme_from_initiative_skipped', NULL,
              format('skipped — initiative "%s" resolves to %s distinct themes (ambiguous), theme_id left NULL for manual resolution', public.strata_entity_name('initiative', ini_id), array_length(theme_ids, 1)));
      CONTINUE;
    END IF;

    resolved_theme := theme_ids[1];

    SELECT * INTO ini FROM public.strata_initiatives WHERE id = ini_id;

    UPDATE public.strata_project_cards
       SET theme_id = COALESCE(theme_id, resolved_theme),
           sponsor_id = COALESCE(sponsor_id, ini.sponsor_id),
           business_case = COALESCE(business_case, ini.business_case),
           value_hypothesis = COALESCE(value_hypothesis, ini.value_hypothesis),
           budget = COALESCE(budget, ini.budget_envelope),
           updated_at = now()
     WHERE id = pc.id;

    INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
    VALUES ('strata_project_cards', pc.id, 'BACKFILL:theme_from_initiative', NULL,
            format('theme_id ← "%s" (via initiative "%s"); sponsor/business_case/value_hypothesis/budget migrated from initiative where the card field was empty',
                   public.strata_entity_name('element', resolved_theme), public.strata_entity_name('initiative', ini_id)));
  END LOOP;
END;
$backfill$;

-- ---------------------------------------------------------------------------
-- Benefit attribution: seed strata_benefit_project_cards from the existing
-- strata_benefit_initiatives rows, routed through the SAME initiative ->
-- project_card mapping used above (rule §19: Project Card becomes the
-- primary attribution target). Only when the initiative maps to EXACTLY ONE
-- project card — ambiguous cases are skipped and logged, never guessed.
-- strata_benefit_initiatives rows are left in place (not deleted).
-- ---------------------------------------------------------------------------
DO $benefit_backfill$
DECLARE
  bi record;
  card_ids uuid[];
BEGIN
  FOR bi IN SELECT * FROM public.strata_benefit_initiatives LOOP
    SELECT array_agg(DISTINCT project_card_id) INTO card_ids
      FROM public.strata_initiative_projects WHERE initiative_id = bi.initiative_id;

    IF card_ids IS NULL OR array_length(card_ids, 1) IS NULL THEN
      INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
      VALUES ('strata_benefit_initiatives', bi.id, 'BACKFILL:benefit_attribution_skipped', NULL,
              format('skipped — initiative "%s" has no linked project card', public.strata_entity_name('initiative', bi.initiative_id)));
      CONTINUE;
    END IF;

    IF array_length(card_ids, 1) > 1 THEN
      INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
      VALUES ('strata_benefit_initiatives', bi.id, 'BACKFILL:benefit_attribution_skipped', NULL,
              format('skipped — initiative "%s" maps to %s project cards (ambiguous)', public.strata_entity_name('initiative', bi.initiative_id), array_length(card_ids, 1)));
      CONTINUE;
    END IF;

    INSERT INTO public.strata_benefit_project_cards (benefit_id, project_card_id, attribution_share)
    VALUES (bi.benefit_id, card_ids[1], bi.attribution_share)
    ON CONFLICT (benefit_id, project_card_id) DO NOTHING;

    INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
    VALUES ('strata_benefit_initiatives', bi.id, 'BACKFILL:benefit_attribution', NULL,
            format('attribution migrated to project card "%s" (via initiative "%s")',
                   public.strata_entity_name('project_card', card_ids[1]), public.strata_entity_name('initiative', bi.initiative_id)));
  END LOOP;
END;
$benefit_backfill$;
