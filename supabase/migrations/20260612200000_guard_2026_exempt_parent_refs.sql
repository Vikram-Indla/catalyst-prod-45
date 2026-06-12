-- Exempt parent pull-through rows from the 2026 date gate.
-- CLAUDE.md 2026-06-12: pre-2026 parents referenced by 2026 children
-- must be upserted as reference rows. They are marked source='jira_parent_ref'
-- by the gap-fill step in wh-jira-bulk-sync.
CREATE OR REPLACE FUNCTION public.guard_2026_ph_issues()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Always allow soft-delete UPDATEs (setting jira_removed_at / deleted_at).
  IF TG_OP = 'UPDATE'
     AND OLD.jira_removed_at IS NULL
     AND NEW.jira_removed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Parent pull-through exemption (CLAUDE.md 2026-06-12).
  -- Gap-fill inserts pre-2026 parent rows with source='jira_parent_ref'.
  -- These are reference-only rows; skip the date gate for them.
  IF NEW.source = 'jira_parent_ref' THEN
    RETURN NEW;
  END IF;

  -- Block inserts/updates for pre-2026 data (SUPER STRICT GUARDRAIL).
  IF NEW.jira_created_at IS NOT NULL AND NEW.jira_created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL; -- silently skip
  END IF;

  RETURN NEW;
END;
$function$;
