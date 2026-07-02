-- CAT-SPRINTS-NATIVE-20260702-002 S0.2b: sprint-membership changelog trigger + FK codification.
-- D-018: membership changes are audited by a DB trigger (work_item_changelogs is
-- service-role-write-only by design — client inserts would need a forgeable INSERT policy).
-- Council #9: forward-only instrumentation; no retroactive rows exist.

BEGIN;

-- Codify the out-of-band FK repoint (A5 F6): bootstrap migration still points
-- work_item_changelogs.work_item_id at the dead work_items table; live staging
-- was repointed to ph_issues out-of-band. Make migrations the source of truth.
-- NOT VALID is required: the 3,054 Jira-backfilled changelog rows hold ids that
-- exist in neither ph_issues nor work_items (staging was seeded with FK triggers
-- disabled, so the prior "validated" flag was a restore artifact). New rows are
-- fully enforced; legacy audit rows are kept as-is rather than deleted.
ALTER TABLE public.work_item_changelogs
  DROP CONSTRAINT IF EXISTS work_item_changelogs_work_item_id_fkey;
ALTER TABLE public.work_item_changelogs
  ADD CONSTRAINT work_item_changelogs_work_item_id_fkey
  FOREIGN KEY (work_item_id) REFERENCES public.ph_issues(id) ON DELETE CASCADE
  NOT VALID;

CREATE OR REPLACE FUNCTION public.record_sprint_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  actor_avatar text;
  from_name text;
  to_name text;
BEGIN
  IF NEW.sprint_id IS NOT DISTINCT FROM OLD.sprint_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    -- No authenticated actor (service-role/backfill writes) — not a genuine
    -- user-driven membership change. Skip, consistent with D-013.
    RETURN NEW;
  END IF;

  SELECT full_name, avatar_url INTO actor_name, actor_avatar
  FROM public.profiles WHERE id = auth.uid();

  SELECT name INTO from_name FROM public.ph_jira_sprints WHERE id = OLD.sprint_id;
  SELECT name INTO to_name   FROM public.ph_jira_sprints WHERE id = NEW.sprint_id;

  INSERT INTO public.work_item_changelogs (
    work_item_id, field_name, field_type,
    from_value, from_display, to_value, to_display,
    changed_by, changed_by_avatar, changed_at, jira_changelog_id
  ) VALUES (
    NEW.id, 'sprint', 'catalyst',
    OLD.sprint_id::text, from_name, NEW.sprint_id::text, to_name,
    COALESCE(actor_name, 'Unknown'), actor_avatar, now(), NULL
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_record_sprint_membership_change
  AFTER UPDATE OF sprint_id ON public.ph_issues
  FOR EACH ROW EXECUTE FUNCTION public.record_sprint_membership_change();

COMMIT;
