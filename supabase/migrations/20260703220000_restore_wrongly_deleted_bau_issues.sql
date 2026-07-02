-- CAT-DETAIL-MODAL-404-20260702-001: restore 21 ph_issues rows in BAU that
-- were wrongly soft-deleted in two bulk operations. Discovered while
-- investigating "Issue not found" on backlog key-link clicks — the backlog
-- list (useBacklogData.ts) never filtered deleted_at, so these rows kept
-- showing as live, but the detail view correctly excluded them.
--
-- Evidence: two batches share an exact per-batch millisecond deleted_at
-- timestamp (a single UPDATE each, not individual user deletions):
--   - 2026-06-22T21:51:56.183Z (6 rows, source='jira_parent_ref')
--   - 2026-06-24T08:05:02.163Z (15 rows, source='jira')
-- All 21 keys were cross-checked live against Jira (cloud
-- digital-transformation.atlassian.net) via JQL on 2026-07-03 and confirmed
-- alive with real, non-terminal-or-legitimately-terminal statuses (Backlog,
-- In Progress, On Hold, In Requirements, or genuinely Done) — none show any
-- sign of deletion upstream. This is decisive per "Jira is source of truth".
--
-- NOT restored (left deleted — confirmed legitimate):
--   - 5 source='catalyst' local test/draft rows (junk summaries)
--   - BAU-6080/6081/6082 (source='jira', same 06-22 batch) — do not exist
--     in Jira at all, confirmed via JQL zero-result search
--   - 6 WF-TEST-* rows — individual dev fixtures, distinct timestamps
--   - BAU-6077 — alive in Jira but has its own distinct timestamp (doesn't
--     match either bulk-corruption batch) and a bare "test" summary;
--     left for manual review rather than auto-restored
--
-- Reversal: re-set deleted_at to the original values above if this proves
-- wrong for any key.

BEGIN;

DO $$
DECLARE
  restored_count bigint;
BEGIN
  UPDATE public.ph_issues
  SET deleted_at = NULL
  WHERE project_key = 'BAU'
    AND issue_key IN (
      'BAU-2737','BAU-4348','BAU-2240','BAU-2297','BAU-70','BAU-3903',
      'BAU-13','BAU-316','BAU-203','BAU-22','BAU-2221','BAU-2225',
      'BAU-2242','BAU-3097','BAU-3540','BAU-3726','BAU-3926','BAU-4231',
      'BAU-4299','BAU-665','BAU-72'
    )
    AND deleted_at IN ('2026-06-22T21:51:56.183+00:00', '2026-06-24T08:05:02.163+00:00');

  GET DIAGNOSTICS restored_count = ROW_COUNT;

  IF restored_count != 21 THEN
    RAISE EXCEPTION 'expected to restore 21 rows, matched %', restored_count;
  END IF;

  RAISE NOTICE 'restored % wrongly soft-deleted BAU issues', restored_count;
END $$;

COMMIT;
