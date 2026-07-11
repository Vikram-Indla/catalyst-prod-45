-- ============================================================================
-- STRATA strategy_elements — auto-slug trigger
-- CAT-STRATA-HIERARCHY-20260706-001
--
-- strata_strategy_elements.slug is UNIQUE but nullable, and unlike
-- strata_initiatives/strata_project_cards/strata_portfolios/strata_benefits
-- (20260705100300_strata_execution_value.sql:296-300) it never got a
-- trg_<table>_slug BEFORE INSERT trigger, despite a comment in
-- 20260705140100_strata_entity_create_rpcs.sql:6-8 claiming one exists.
-- strata_create_strategy_element does not set slug itself. Verified on
-- staging (cyijbdeuehohvhnsywig): 0 existing rows currently have a NULL
-- slug, so no backfill is required there — but the trigger must exist
-- before this table can support a slug-based detail route (this feature's
-- next slice), otherwise future creates would silently get slug=NULL.
-- Reuses the existing generic, table-agnostic strata_generate_slug()
-- function — no new function code.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_strata_strategy_elements_slug ON public.strata_strategy_elements;
CREATE TRIGGER trg_strata_strategy_elements_slug
  BEFORE INSERT ON public.strata_strategy_elements
  FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug();

-- Defensive backfill for any environment where NULL slugs do exist (verified
-- zero such rows on staging at the time of writing, but this makes the
-- migration correct and re-runnable everywhere, not just staging).
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.strata_strategy_elements WHERE slug IS NULL ORDER BY created_at LOOP
    base := public.strata_slugify(r.name);
    IF base = '' THEN base := 'item'; END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    UPDATE public.strata_strategy_elements SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;
