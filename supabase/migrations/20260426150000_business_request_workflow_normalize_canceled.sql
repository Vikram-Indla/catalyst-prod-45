-- ════════════════════════════════════════════════════════════════════════════
-- Business Request workflow — normalize 'canceled' → 'cancelled' (British)
-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3 hygiene migration following 20260426140000_business_request_workflow_seed.sql
--
-- Background:
--   The Phase 1 seed used American spelling 'canceled'.
--   The codebase TypeScript type `InitiativeStatus` and every existing row
--   in `ph_initiatives.status` use British spelling 'cancelled'.
--   Aligning the workflow slug to the existing data (rather than touching
--   the type and every consumer) is the lowest-blast-radius fix.
--
-- This migration is purely an UPDATE — no schema change.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.catalyst_workflow_statuses
SET
  slug = 'cancelled',
  name = 'Cancelled'
WHERE
  slug = 'canceled'
  AND scheme_id IN (
    SELECT id FROM public.catalyst_workflow_schemes
    WHERE issue_type = 'Business Request'
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Verification
-- ════════════════════════════════════════════════════════════════════════════
-- After deploy, confirm every ph_initiatives.status value matches a canonical
-- workflow slug. Expected: zero orphans.
--
--   SELECT DISTINCT i.status
--     FROM ph_initiatives i
--    WHERE i.status NOT IN (
--      SELECT slug
--        FROM catalyst_workflow_statuses
--       WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes
--                           WHERE issue_type = 'Business Request')
--    );                                                          -- expect 0 rows
--
--   SELECT slug FROM catalyst_workflow_statuses
--    WHERE scheme_id = (SELECT id FROM catalyst_workflow_schemes
--                        WHERE issue_type = 'Business Request')
--    ORDER BY position;
--   -- expect: new, portfolio_review, technical_validation, estimate,
--   --         demand_approved, analysis, ready_for_development,
--   --         under_implementation, implementation_review, on_hold,
--   --         in_support, done, cancelled
-- ════════════════════════════════════════════════════════════════════════════
