-- CAT-STRATA-E2E-FIXES-20260711-001 — defect STRATA-E2E-008.
--
-- The canonical STRATA strategy hierarchy is two-tier under a cycle:
--   Cycle -> Theme (root-level) -> Objective
-- (CAT-STRATA-HIERARCHY-20260706-001: "Themes are root-level"; the authoring
-- forms expose no parent field for a Theme.)
--
-- Seed data violated this by nesting Themes beneath other Themes — a 3-tier
-- "pillar" model seeded for the investor cycle plus a couple of demo/proof rows.
-- Repair: flatten every Theme to root level (parent_id = NULL). Objective trees
-- (objective-under-objective) are an intentional part of the model and are left
-- untouched. Idempotent: only rows that still have a parent are updated.
--
-- Decision: Vikram, 2026-07-11 ("flatten all themes to root-level").

UPDATE public.strata_strategy_elements
SET parent_id = NULL,
    updated_at = now()
WHERE element_type = 'theme'
  AND parent_id IS NOT NULL;
