-- ============================================================================
-- F13 Migration — Catalyst-native rows → ph_issues mirror
-- ============================================================================
-- Why: CatalystDetailRouter (src/components/catalyst-detail-views/
-- CatalystDetailRouter.tsx:49-54) queries ph_issues by id. Catalyst-native
-- items (BAU-1 "Test, 25 April." etc.) live only in catalyst_issues, so
-- the lookup returns null → detail panel renders breadcrumb only, empty body.
-- This migration copies them into ph_issues so the panel renders.
--
-- Idempotent: safe to re-run (NOT EXISTS guard + ON CONFLICT DO NOTHING).
-- Reversible: rows inserted by this can be identified via JOIN on
--             catalyst_issues.id = ph_issues.id.
-- ============================================================================

-- ── STEP 1 — DRY RUN. Review which rows would migrate before running step 2.
SELECT
  ci.id,
  ci.issue_key,
  ci.title       AS will_become_summary,
  ci.status,
  ci.issue_type,
  p.key          AS will_become_project_key,
  ci.created_at  AS will_become_jira_created_at,
  ci.updated_at  AS will_become_jira_updated_at
FROM catalyst_issues ci
LEFT JOIN ph_projects p ON p.id = ci.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM ph_issues pi WHERE pi.id = ci.id
)
ORDER BY ci.created_at DESC;

-- ── STEP 2 — MIGRATE. Run after reviewing STEP 1.
BEGIN;

INSERT INTO ph_issues (
  id,
  issue_key,
  summary,
  status,
  priority,
  issue_type,
  project_key,
  jira_created_at,
  jira_updated_at
)
SELECT
  ci.id,
  ci.issue_key,
  ci.title       AS summary,
  ci.status,
  ci.priority,
  ci.issue_type,
  p.key          AS project_key,
  ci.created_at  AS jira_created_at,
  ci.updated_at  AS jira_updated_at
FROM catalyst_issues ci
LEFT JOIN ph_projects p ON p.id = ci.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM ph_issues pi WHERE pi.id = ci.id
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── STEP 3 — VERIFY. Count + confirm BAU-1 now resolves.
SELECT COUNT(*) AS catalyst_rows_now_in_ph_issues
FROM ph_issues pi
WHERE EXISTS (SELECT 1 FROM catalyst_issues ci WHERE ci.id = pi.id);

SELECT id, issue_key, summary, issue_type, project_key
FROM ph_issues
WHERE issue_key = 'BAU-1';

-- ============================================================================
-- ROLLBACK (if needed) — removes only rows that came from catalyst_issues.
-- Run with care — this DELETE removes the migrated rows by matching on id.
-- ============================================================================
-- BEGIN;
-- DELETE FROM ph_issues pi
-- WHERE EXISTS (SELECT 1 FROM catalyst_issues ci WHERE ci.id = pi.id);
-- COMMIT;
