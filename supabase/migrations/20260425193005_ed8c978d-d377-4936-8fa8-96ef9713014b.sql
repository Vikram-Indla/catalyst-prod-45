-- Phase 4 — Expand catalyst_issues audit trigger to log all parity fields.
-- Fields added:
--   labels                 (text[])     — user-facing labels (was missing; trigger only watched legacy `tags`)
--   parent_key             (text)       — denormalized parent key for cross-source parents
--   fix_versions           (jsonb)      — release/fix-version array
--   acceptance_criteria    (jsonb)      — AC ADF blob
--   status_category        (text)       — derived board column
--   description_adf_raw    (jsonb)      — rich description (currently only plain `description` was watched)
--   release_id             (uuid)       — already in original list, kept
-- The `tags` field is removed from the watch list (now superseded by `labels`).

CREATE OR REPLACE FUNCTION public.tg_catalyst_issue_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f text;
  fields text[] := ARRAY[
    'title','description','description_adf_raw','status','status_category',
    'priority','assignee_id','reporter_id','parent_id','parent_key',
    'story_points','sprint_name','release_id','labels','fix_versions',
    'acceptance_criteria','issue_type'
  ];
  oldv text; newv text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id)
    VALUES (NEW.id, 'created', COALESCE(auth.uid(), NEW.reporter_id));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- soft delete / restore
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      INSERT INTO public.catalyst_activity_log(work_item_id, action, user_id)
      VALUES (NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'restored' ELSE 'deleted' END, auth.uid());
    END IF;

    FOREACH f IN ARRAY fields LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
        INTO oldv, newv USING OLD, NEW;
      IF oldv IS DISTINCT FROM newv THEN
        INSERT INTO public.catalyst_activity_log(
          work_item_id, action, field_name, old_value, new_value, user_id
        )
        VALUES (NEW.id, 'updated', f, oldv, newv, auth.uid());
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;