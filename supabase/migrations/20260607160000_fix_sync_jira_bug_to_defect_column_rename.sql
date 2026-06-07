-- Fix the `sync_jira_bug_to_defect` trigger function after the
-- 2026-06-02 column rename (`fix_versions` → `sprint_release` on
-- ph_issues, `jira_fix_versions` → `jira_sprint_release` on tm_defects).
--
-- The rename migration (20260602100000_rename_fix_versions_to_sprint_release.sql)
-- updated the ph_issues + tm_defects column names but left this trigger
-- function still referencing the old names. Any UPDATE to ph_issues
-- on a QA Bug row (e.g. linking it as a child via parent_key) now
-- raises:
--   ERROR: 42703 — column "jira_fix_versions" of relation "tm_defects" does not exist
--   ERROR: 42703 — column "fix_versions" of relation "ph_issues" does not exist
-- Because the trigger fires inside the user's transaction, the whole
-- mutation rolls back and the link operation silently fails.
--
-- Fix: CREATE OR REPLACE the function with the new column names. The
-- function body is otherwise identical to the bootstrap version
-- (supabase/migrations/20260516120000_bootstrap_full_schema.sql:18706).
-- The trigger itself doesn't need to be recreated — it still points
-- at this function by name.

CREATE OR REPLACE FUNCTION public.sync_jira_bug_to_defect() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_severity public.tm_defect_severity;
  v_status public.tm_defect_status;
  v_components TEXT[];
  v_labels TEXT[];
  v_project_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_bug_types TEXT[] := ARRAY['qa bug', 'bug', 'defect'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF LOWER(OLD.issue_type) = ANY(v_bug_types) THEN
      UPDATE public.tm_defects SET status = 'closed', updated_at = NOW() WHERE jira_key = OLD.issue_key;
    END IF;
    RETURN OLD;
  END IF;
  IF NOT (LOWER(NEW.issue_type) = ANY(v_bug_types)) THEN RETURN NEW; END IF;

  v_severity := CASE LOWER(COALESCE(NEW.priority, 'medium'))
    WHEN 'highest' THEN 'critical' WHEN 'high' THEN 'major'
    WHEN 'medium' THEN 'minor' WHEN 'low' THEN 'trivial'
    WHEN 'lowest' THEN 'trivial' ELSE 'minor' END;
  v_status := CASE
    WHEN NEW.status_category = 'Done' AND NEW.resolution IS NOT NULL THEN 'resolved'
    WHEN NEW.status_category = 'Done' THEN 'closed'
    WHEN NEW.status_category = 'In Progress' THEN 'in_progress'
    ELSE 'open' END;
  v_components := public.jsonb_to_text_array(NEW.components);
  v_labels := public.jsonb_to_text_array(NEW.labels);

  INSERT INTO public.tm_defects (
    id, project_id, defect_key, title, description, severity, status, priority,
    jira_key, jira_source, jira_project_key, jira_status, jira_status_category,
    jira_assignee_name, jira_reporter_name, jira_resolution, jira_created_at, jira_updated_at,
    last_synced_at, jira_parent_key, jira_story_points, jira_sprint_name,
    jira_components, jira_sprint_release, labels, component,
    external_id, external_url, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_project_id, public.next_defect_key(),
    LEFT(NEW.summary, 500), NEW.description_text, v_severity, v_status,
    COALESCE(NEW.priority, 'Medium'),
    NEW.issue_key, true, NEW.project_key, NEW.status, NEW.status_category,
    NEW.assignee_display_name, NEW.reporter_display_name,
    NEW.resolution, NEW.jira_created_at, NEW.jira_updated_at,
    NOW(), NEW.parent_key, NEW.story_points, NEW.sprint_name,
    v_components, NEW.sprint_release, v_labels,
    CASE WHEN v_components IS NOT NULL AND array_length(v_components, 1) > 0 THEN v_components[1] ELSE NULL END,
    NEW.issue_key, 'https://digital-transformation.atlassian.net/browse/' || NEW.issue_key,
    COALESCE(NEW.jira_created_at, NOW()), NOW()
  )
  ON CONFLICT (jira_key) WHERE jira_key IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title, description = EXCLUDED.description,
    severity = EXCLUDED.severity, status = EXCLUDED.status, priority = EXCLUDED.priority,
    jira_status = EXCLUDED.jira_status, jira_status_category = EXCLUDED.jira_status_category,
    jira_assignee_name = EXCLUDED.jira_assignee_name, jira_reporter_name = EXCLUDED.jira_reporter_name,
    jira_resolution = EXCLUDED.jira_resolution, jira_updated_at = EXCLUDED.jira_updated_at,
    last_synced_at = NOW(),
    jira_parent_key = EXCLUDED.jira_parent_key, jira_story_points = EXCLUDED.jira_story_points,
    jira_sprint_name = EXCLUDED.jira_sprint_name,
    jira_components = EXCLUDED.jira_components, jira_sprint_release = EXCLUDED.jira_sprint_release,
    labels = EXCLUDED.labels, component = EXCLUDED.component, updated_at = NOW();
  RETURN NEW;
END;
$$;
