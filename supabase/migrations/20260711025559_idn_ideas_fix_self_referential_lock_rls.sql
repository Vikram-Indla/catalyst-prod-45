-- ============================================================================
-- CAT-IDEATION-REBUILD-20260709-001 · Phase 5/3 fix · idn_ideas RLS repair
--
-- ⚠️ DRAFTED FOR REVIEW — NOT YET APPLIED to any environment as of authoring.
-- This is a security-policy change to a live database and is not applied
-- unilaterally. Apply only after Vikram has reviewed and approved it
-- (via Supabase MCP `apply_migration` against staging first, verify, then
-- prod). Confirmed root cause, not theoretical — see
-- features/CAT-IDEATION-REBUILD-20260709-001/06_VALIDATION_EVIDENCE.md
-- "Merge + Conversion" section for the live repro (real
-- "new row violates row-level security policy" error, caught 2026-07-11).
--
-- BUG: idn_ideas_update (from 20260709130000_idn_core_schema.sql) has no
-- explicit WITH CHECK, so Postgres reuses USING evaluated against the NEW
-- row on UPDATE. The policy's own terminal-lock conditions
-- (converted_business_request_id IS NULL, decision IS DISTINCT FROM
-- 'merged') then reject the exact values the Merge and Conversion
-- transitions are trying to write — the policy meant to protect an
-- ALREADY-locked idea instead blocks the transition INTO the locked state
-- in the first place. Confirmed live: every merge and every conversion,
-- for every user, fails with this exact error.
--
-- FIX: split into a real USING (evaluated on the OLD row only — still
-- correctly blocks editing an already-locked idea) + a WITH CHECK that
-- only re-verifies actor permission (role-based), not new-row lock state.
--
-- SECOND FIX: idn_conversions has no DELETE policy at all (only SELECT +
-- INSERT), so Conversion's compensating cleanup (delete the orphaned
-- business_requests + idn_conversions rows when the final idn_ideas update
-- fails) silently no-ops — confirmed live, a real orphaned row was created
-- and had to be cleaned up manually via the Supabase MCP connector during
-- this session's testing. Scoped narrowly to the row's own creator (or
-- admin) — an audit trail shouldn't be arbitrarily deletable by anyone.
-- ============================================================================

DROP POLICY IF EXISTS idn_ideas_update ON public.idn_ideas;

CREATE POLICY idn_ideas_update ON public.idn_ideas
  FOR UPDATE
  USING (
    -- Old-row check: can't touch an idea that's already terminal-locked.
    converted_business_request_id IS NULL
    AND decision IS DISTINCT FROM 'merged'
    AND (
      (submitter_id = auth.uid() AND workflow_status_key = 'draft')
      OR public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[])
    )
  )
  WITH CHECK (
    -- New-row check: actor permission only. Deliberately does NOT re-test
    -- converted_business_request_id/decision on the new row — that's
    -- exactly what blocked the transition INTO the locked state.
    (submitter_id = auth.uid() AND workflow_status_key = 'draft')
    OR public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[])
  );

CREATE POLICY idn_conversions_delete ON public.idn_conversions
  FOR DELETE
  USING (converted_by = auth.uid() OR public.idn_is_admin());
