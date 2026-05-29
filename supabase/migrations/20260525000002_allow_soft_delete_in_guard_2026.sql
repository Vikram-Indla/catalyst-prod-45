-- Migration: allow_soft_delete_in_guard_2026
-- Date: 2026-05-25
--
-- Allow the prune soft-delete path to work even on rows with jira_created_at < 2026-01-01.
--
-- ROOT CAUSE:
--   The prune step in wh-jira-sync calls:
--     UPDATE ph_issues SET jira_removed_at = now(), deleted_at = now()
--     WHERE issue_key IN (...) AND jira_removed_at IS NULL
--   This is the correct path (per guard_ph_issues_no_delete which raises an exception
--   on hard DELETEs and says "Use jira_removed_at soft-delete").
--
--   However, guard_2026_ph_issues was blocking ALL UPDATEs where NEW.jira_created_at < 2026-01-01,
--   which included the soft-delete UPDATE. A pre-2026 row could never be marked as removed.
--
-- FIX:
--   Short-circuit before the year-check whenever the UPDATE is a soft-delete transition
--   (OLD.jira_removed_at IS NULL → NEW.jira_removed_at IS NOT NULL).

CREATE OR REPLACE FUNCTION guard_2026_ph_issues() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Always allow soft-delete UPDATEs (setting jira_removed_at / deleted_at).
  -- This is the intended prune path per guard_ph_issues_no_delete.
  IF TG_OP = 'UPDATE'
     AND OLD.jira_removed_at IS NULL
     AND NEW.jira_removed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Block inserts/updates for pre-2026 data (SUPER STRICT GUARDRAIL).
  IF NEW.jira_created_at IS NOT NULL AND NEW.jira_created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL; -- silently skip
  END IF;

  RETURN NEW;
END;
$$;
