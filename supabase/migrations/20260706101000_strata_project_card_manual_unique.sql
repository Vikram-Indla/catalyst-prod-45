-- ============================================================================
-- STRATA RECOVERY — allow unlimited MANUAL project cards
-- CAT-STRATA-20260705-001 · Session 004 · F-EXE-006 defect (caught by the
-- rebuild proof: the second manual card ever created collided with the seed's
-- one manual card).
--
-- The original UNIQUE NULLS NOT DISTINCT (source_system, source_key) treats
-- all NULL source keys as equal, so the whole deployment could hold exactly
-- ONE manual project card — the opposite of the source-agnostic Project Card
-- contract (manual cards have no source key by definition). Replace with a
-- partial unique index: source-key dedup still applies to keyed sources
-- (jira/upload/api), manual cards are unconstrained.
-- ============================================================================

ALTER TABLE public.strata_project_cards
  DROP CONSTRAINT IF EXISTS strata_project_cards_source_system_source_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS strata_project_cards_source_key_uniq
  ON public.strata_project_cards (source_system, source_key)
  WHERE source_key IS NOT NULL;
