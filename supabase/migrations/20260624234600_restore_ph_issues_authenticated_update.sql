-- Restore authenticated UPDATE policy on ph_issues.
--
-- Context (2026-06-24, /release-hub/releases-management):
-- The release detail page's "Add work items" modal could not link any work
-- item to a release. Mutation reported "Update returned 0 rows" while no error
-- was raised. Root-cause investigation:
--
--   SELECT polname, polcmd,
--          ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(polroles)) AS roles
--   FROM pg_policy WHERE polrelid = 'public.ph_issues'::regclass;
--
--   wh_issues_select   r  {authenticated}
--   wh_issues_service  *  {service_role}
--
-- Authenticated users had no UPDATE policy. PostgreSQL RLS silently denies the
-- statement (0 rows in RETURNING, no error). The previous policy
-- "wh_issues_update" (migration 20260411003817_12afd315-5b20-430b-8917-d618174de59c.sql,
-- "FOR UPDATE TO authenticated USING (true) WITH CHECK (true)") was dropped at
-- some point — likely during a later RLS hardening pass that was never
-- reconciled with the inline-edit code paths that depend on direct UPDATE
-- against ph_issues (release membership, assignee picker, status transitions,
-- priority, due date, fix versions, etc.).
--
-- Fix: restore the policy. Matches the pre-existing pattern used by every
-- direct-update inline editor in the codebase. The 2026 strict guardrail and
-- source-validation trigger functions remain in place (when the corresponding
-- triggers are wired) — those enforce data integrity, RLS enforces access.

DROP POLICY IF EXISTS "wh_issues_update" ON public.ph_issues;

CREATE POLICY "wh_issues_update"
ON public.ph_issues
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
