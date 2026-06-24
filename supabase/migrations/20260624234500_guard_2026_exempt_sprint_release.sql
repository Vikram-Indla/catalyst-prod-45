-- Exempt sprint_release-membership UPDATEs from the 2026 date gate.
--
-- Context (2026-06-24, /release-hub/releases-management):
-- The release detail page's "Add work items" modal appends a release reference
-- to ph_issues.sprint_release (JSONB array of { id, name, releaseDate }). For
-- rows whose jira_created_at < 2026-01-01 (Lovable backfill, MDT-NEW-* items,
-- legacy parents), guard_2026_ph_issues() previously returned NULL — silently
-- cancelling the UPDATE. Authenticated RLS was permissive (USING(true)) so the
-- failure surfaced as 0 rows in RETURNING with no error.
--
-- Fix: release membership is curatorial metadata, not Jira-sourced data. A
-- UPDATE that touches ONLY sprint_release does not violate the 2026 strict
-- guardrail (no pre-2026 issue body or status is being mutated). Exempt these
-- UPDATEs explicitly. Other column changes on pre-2026 rows remain blocked.
--
-- Strictness: the exemption requires sprint_release to ACTUALLY change AND
-- every other strict-guard-relevant column to be unchanged. Piggybacked edits
-- to summary / status / description / dates still get blocked.

CREATE OR REPLACE FUNCTION public.guard_2026_ph_issues()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Always allow soft-delete UPDATEs (setting jira_removed_at).
  IF TG_OP = 'UPDATE'
     AND OLD.jira_removed_at IS NULL
     AND NEW.jira_removed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Parent pull-through exemption (CLAUDE.md 2026-06-12).
  IF NEW.source = 'jira_parent_ref' THEN
    RETURN NEW;
  END IF;

  -- Release-membership UPDATE exemption (CLAUDE.md 2026-06-24).
  -- sprint_release is curatorial metadata (which releases this issue belongs
  -- to). Pre-2026 rows must be linkable to current 2026 releases for reporting
  -- without relaxing the broader 2026 data gate.
  IF TG_OP = 'UPDATE'
     AND NEW.sprint_release IS DISTINCT FROM OLD.sprint_release
     AND NEW.summary           IS NOT DISTINCT FROM OLD.summary
     AND NEW.description_text  IS NOT DISTINCT FROM OLD.description_text
     AND NEW.status            IS NOT DISTINCT FROM OLD.status
     AND NEW.status_category   IS NOT DISTINCT FROM OLD.status_category
     AND NEW.issue_type        IS NOT DISTINCT FROM OLD.issue_type
     AND NEW.priority          IS NOT DISTINCT FROM OLD.priority
     AND NEW.parent_key        IS NOT DISTINCT FROM OLD.parent_key
     AND NEW.project_key       IS NOT DISTINCT FROM OLD.project_key
     AND NEW.jira_created_at   IS NOT DISTINCT FROM OLD.jira_created_at
     AND NEW.jira_updated_at   IS NOT DISTINCT FROM OLD.jira_updated_at
     AND NEW.source            IS NOT DISTINCT FROM OLD.source THEN
    RETURN NEW;
  END IF;

  -- Block inserts/updates for pre-2026 data (SUPER STRICT GUARDRAIL).
  IF NEW.jira_created_at IS NOT NULL AND NEW.jira_created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$function$;
