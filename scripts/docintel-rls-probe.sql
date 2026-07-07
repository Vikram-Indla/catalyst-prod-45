-- ============================================================================
-- docintel-rls-probe.sql — Doc Intel RLS evidence probe (S9)
-- CAT-DOCEX-RAG-AGENTS / CAT-DOCINTEL-ARABIC-RAG-20260706-001
--
-- WHAT THIS PROVES
--   The membership-scoped RLS on the Doc Intel reservoir actually denies a
--   non-member: with request.jwt.claims set to a random (non-member) user
--   uuid under the `authenticated` role, SELECT on ai_documents,
--   ai_document_embeddings and ai_document_links must return 0 rows, while
--   the same SELECTs without RLS (service/table-owner view) return the real
--   row counts (>0 on a seeded environment).
--
--   Policies under test (supabase/migrations/20260707031000_docintel_rls_audit.sql
--   and 20260707110000_docintel_document_links.sql):
--     project_id IN (SELECT project_id FROM ph_project_members
--                    WHERE user_id = auth.uid())
--
-- HOW TO RUN (staging cyijbdeuehohvhnsywig — never prod without instruction)
--   * Supabase CLI (from a checkout linked to STAGING — verify first:
--       cat supabase/.temp/project-ref        -- must print cyijbdeuehohvhnsywig
--     ):
--       supabase db query --linked --file scripts/docintel-rls-probe.sql
--   * Or MCP: paste the whole script into a single execute_sql call
--     (it is one transaction; the trailing ROLLBACK guarantees no state change).
--   * Or psql: psql "$STAGING_DB_URL" -f scripts/docintel-rls-probe.sql
--
-- READING THE OUTPUT
--   Each probe row reports expected vs actual and a PASS/FAIL verdict.
--   All rows must be PASS. "service view" rows are informational on an empty
--   database (they PASS only when the environment has seeded Doc Intel data —
--   365 embeddings existed on staging as of 2026-07-07).
--
-- THIS IS EVIDENCE TOOLING, NOT CI. It needs a live database; the vitest
-- suite (src/test/edge/docintel-contracts.test.ts) covers the no-DB contracts.
-- The transaction ROLLS BACK — the probe never mutates anything.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Impersonate a NON-MEMBER authenticated user.
--    A freshly generated uuid cannot exist in ph_project_members, so every
--    membership predicate must evaluate false. set_config(..., true) is
--    transaction-local; SET LOCAL ROLE ends at COMMIT/ROLLBACK.
-- ---------------------------------------------------------------------------
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  gen_random_uuid()::text,
    'role', 'authenticated'
  )::text,
  true
) AS impersonated_claims;

SET LOCAL ROLE authenticated;

-- Sanity: auth.uid() resolves to the fake sub and is a member of nothing.
SELECT
  auth.uid()                                                        AS probe_uid,
  (SELECT count(*) FROM public.ph_project_members
    WHERE user_id = auth.uid())                                     AS memberships_expected_0;

-- ---------------------------------------------------------------------------
-- 2) Non-member SELECT probes — every count must be 0.
-- ---------------------------------------------------------------------------
SELECT 'non-member: ai_documents'            AS probe,
       0                                     AS expected,
       count(*)                              AS actual,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL — RLS LEAK' END AS verdict
FROM public.ai_documents
UNION ALL
SELECT 'non-member: ai_document_embeddings',
       0, count(*),
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL — RLS LEAK' END
FROM public.ai_document_embeddings
UNION ALL
SELECT 'non-member: ai_document_links',
       0, count(*),
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL — RLS LEAK' END
FROM public.ai_document_links;

-- ---------------------------------------------------------------------------
-- 3) Service/owner view — RESET ROLE returns to the connecting superuser /
--    service context (RLS-bypassing, same visibility as service_role clients).
--    On a seeded staging these counts are > 0, proving step 2's zeros came
--    from RLS and not from empty tables.
-- ---------------------------------------------------------------------------
RESET ROLE;

SELECT 'service view: ai_documents'          AS probe,
       '>0 (seeded env)'                     AS expected,
       count(*)                              AS actual,
       CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'CHECK — table empty in this environment' END AS verdict
FROM public.ai_documents
UNION ALL
SELECT 'service view: ai_document_embeddings',
       '>0 (seeded env)', count(*),
       CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'CHECK — table empty in this environment' END
FROM public.ai_document_embeddings
UNION ALL
SELECT 'service view: ai_document_links',
       '>0 (seeded env)', count(*),
       CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'CHECK — table empty in this environment' END
FROM public.ai_document_links;

-- ---------------------------------------------------------------------------
-- 4) Never persist anything.
-- ---------------------------------------------------------------------------
ROLLBACK;
