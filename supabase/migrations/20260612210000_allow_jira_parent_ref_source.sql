-- Allow gap-fill inserts for pre-2026 parent reference rows.
-- CLAUDE.md 2026-06-12: validate_ph_issues_source() only allowed 'catalyst'|'jira'.
-- Adding 'jira_parent_ref' so wh-jira-bulk-sync gap-fill can upsert pre-2026 parent
-- rows that are referenced by 2026 child issues.
CREATE OR REPLACE FUNCTION public.validate_ph_issues_source()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.source NOT IN ('catalyst', 'jira', 'jira_parent_ref') THEN
    RAISE EXCEPTION 'Invalid source value: %', NEW.source;
  END IF;
  IF NEW.sync_status IS NOT NULL AND NEW.sync_status NOT IN ('synced','stale','conflict','syncing','pending') THEN
    RAISE EXCEPTION 'Invalid sync_status value: %', NEW.sync_status;
  END IF;
  RETURN NEW;
END;
$function$;
