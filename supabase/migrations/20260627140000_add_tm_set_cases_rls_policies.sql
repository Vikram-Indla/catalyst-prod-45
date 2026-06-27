-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27 · D11
-- Add RLS policies to tm_set_cases (it shipped with RLS enabled but ZERO
-- policies → default-deny: all set-membership read AND write returned 42501).
--
-- Mirrors the canonical join-table pattern used by tm_cycle_scope: access is
-- gated through the parent (tm_test_sets) via tm_user_has_access(auth.uid(),
-- project_id). tm_set_cases has no project_id of its own, so it joins through
-- test_set_id → tm_test_sets.project_id.
--
-- Approved by Vikram 2026-06-27 (drift log 08, decision: add 4 policies).
-- Idempotent: drops policies if they exist before recreating.

ALTER TABLE public.tm_set_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_set_cases_select ON public.tm_set_cases;
DROP POLICY IF EXISTS tm_set_cases_insert ON public.tm_set_cases;
DROP POLICY IF EXISTS tm_set_cases_update ON public.tm_set_cases;
DROP POLICY IF EXISTS tm_set_cases_delete ON public.tm_set_cases;

CREATE POLICY tm_set_cases_select ON public.tm_set_cases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tm_test_sets s
            WHERE s.id = tm_set_cases.test_set_id
              AND public.tm_user_has_access(auth.uid(), s.project_id))
  );

CREATE POLICY tm_set_cases_insert ON public.tm_set_cases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tm_test_sets s
            WHERE s.id = tm_set_cases.test_set_id
              AND public.tm_user_has_access(auth.uid(), s.project_id))
  );

CREATE POLICY tm_set_cases_update ON public.tm_set_cases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tm_test_sets s
            WHERE s.id = tm_set_cases.test_set_id
              AND public.tm_user_has_access(auth.uid(), s.project_id))
  );

CREATE POLICY tm_set_cases_delete ON public.tm_set_cases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tm_test_sets s
            WHERE s.id = tm_set_cases.test_set_id
              AND public.tm_user_has_access(auth.uid(), s.project_id))
  );
