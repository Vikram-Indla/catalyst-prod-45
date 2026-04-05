
-- Helper function
CREATE OR REPLACE FUNCTION public.jsonb_to_text_array(val JSONB)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN val IS NULL OR val = 'null'::JSONB THEN NULL
    WHEN jsonb_typeof(val) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(val))
    ELSE NULL
  END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.sync_jira_bug_to_defect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_severity public.tm_defect_severity;
  v_status public.tm_defect_status;
  v_components TEXT[];
  v_labels TEXT[];
  v_project_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.issue_type = 'QA Bug' THEN
      UPDATE public.tm_defects SET status = 'closed', updated_at = NOW() WHERE jira_key = OLD.issue_key;
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.issue_type != 'QA Bug' THEN RETURN NEW; END IF;

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
    jira_components, jira_fix_versions, labels, component,
    external_id, external_url, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_project_id, public.next_defect_key(),
    LEFT(NEW.summary, 500), NEW.description_text, v_severity, v_status,
    COALESCE(NEW.priority, 'Medium'),
    NEW.issue_key, true, NEW.project_key, NEW.status, NEW.status_category,
    NEW.assignee_display_name, NEW.reporter_display_name,
    NEW.resolution, NEW.jira_created_at, NEW.jira_updated_at,
    NOW(), NEW.parent_key, NEW.story_points, NEW.sprint_name,
    v_components, NEW.fix_versions, v_labels,
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
    jira_components = EXCLUDED.jira_components, jira_fix_versions = EXCLUDED.jira_fix_versions,
    labels = EXCLUDED.labels, component = EXCLUDED.component, updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_jira_bug_to_defect ON public.ph_issues;
CREATE TRIGGER trg_sync_jira_bug_to_defect
  AFTER INSERT OR UPDATE OR DELETE ON public.ph_issues
  FOR EACH ROW EXECUTE FUNCTION public.sync_jira_bug_to_defect();

-- Backfill
INSERT INTO public.tm_defects (
  id, project_id, defect_key, title, description, severity, status, priority,
  jira_key, jira_source, jira_project_key, jira_status, jira_status_category,
  jira_assignee_name, jira_reporter_name, jira_resolution, jira_created_at, jira_updated_at,
  last_synced_at, jira_parent_key, jira_story_points, jira_sprint_name,
  jira_components, jira_fix_versions, labels, component,
  external_id, external_url, created_at, updated_at
)
SELECT
  gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::UUID,
  'DEF-' || LPAD((ROW_NUMBER() OVER (ORDER BY i.jira_created_at ASC) + (SELECT COALESCE(MAX(CAST(SUBSTRING(defect_key FROM 5) AS INTEGER)), 0) FROM public.tm_defects))::TEXT, 4, '0'),
  LEFT(i.summary, 500), i.description_text,
  (CASE LOWER(COALESCE(i.priority, 'medium'))
    WHEN 'highest' THEN 'critical' WHEN 'high' THEN 'major'
    WHEN 'medium' THEN 'minor' WHEN 'low' THEN 'trivial'
    WHEN 'lowest' THEN 'trivial' ELSE 'minor'
  END)::public.tm_defect_severity,
  (CASE
    WHEN i.status_category = 'Done' AND i.resolution IS NOT NULL THEN 'resolved'
    WHEN i.status_category = 'Done' THEN 'closed'
    WHEN i.status_category = 'In Progress' THEN 'in_progress'
    ELSE 'open'
  END)::public.tm_defect_status,
  COALESCE(i.priority, 'Medium'),
  i.issue_key, true, i.project_key, i.status, i.status_category,
  i.assignee_display_name, i.reporter_display_name,
  i.resolution, i.jira_created_at, i.jira_updated_at,
  NOW(), i.parent_key, i.story_points, i.sprint_name,
  public.jsonb_to_text_array(i.components), i.fix_versions,
  public.jsonb_to_text_array(i.labels),
  CASE WHEN i.components IS NOT NULL AND jsonb_typeof(i.components) = 'array' AND jsonb_array_length(i.components) > 0
    THEN i.components->>0 ELSE NULL END,
  i.issue_key, 'https://digital-transformation.atlassian.net/browse/' || i.issue_key,
  COALESCE(i.jira_created_at, NOW()), NOW()
FROM public.ph_issues i
WHERE i.issue_type = 'QA Bug' AND i.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.tm_defects d WHERE d.jira_key = i.issue_key)
ORDER BY i.jira_created_at ASC;
