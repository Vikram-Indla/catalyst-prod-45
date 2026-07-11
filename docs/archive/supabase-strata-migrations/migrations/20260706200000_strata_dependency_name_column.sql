-- ============================================================================
-- STRATA Execution — additive `name` column on strata_dependencies.
-- CAT-STRATA-20260705-001 · Session 007 (Execution Manual Excel Import) · D-014
--
-- The Excel import's idempotency contract is Project Reference ID + Dependency
-- Name. strata_dependencies never had a name column (confirmed absent in both
-- the original 20260705100300 definition and the 20260706190000 reconciliation
-- migration) — every dependency was previously identified only by its
-- generated id. Nullable: pre-existing rows are left honestly NULL, never
-- backfilled with an invented name (zero-assumption rule).
-- ============================================================================

ALTER TABLE public.strata_dependencies
  ADD COLUMN IF NOT EXISTS name text;

COMMENT ON COLUMN public.strata_dependencies.name IS
  'Dependency Name — required for dependencies created via the Execution Excel import (idempotency key: project_card + name). NULL on rows created before this column existed.';
