-- Drop fake seed infrastructure; rewrite fn_reset_project_workflow to derive from ph_issues

DROP TRIGGER IF EXISTS on_ph_project_created_seed_workflow ON ph_projects;
DROP FUNCTION IF EXISTS public.fn_seed_project_workflow(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_export_project_as_default(UUID) CASCADE;
DROP TABLE IF EXISTS public.ph_workflow_defaults CASCADE;

CREATE OR REPLACE FUNCTION public.fn_reset_project_workflow(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_key TEXT;
BEGIN
  SELECT key INTO v_project_key FROM ph_projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  DELETE FROM ph_workflow_type_statuses WHERE project_id = p_project_id;
  DELETE FROM ph_workflow_statuses WHERE project_id = p_project_id;

  -- Insert statuses: group by LOWER(status) to merge case variants,
  -- pick most-used canonical name and dominant category
  INSERT INTO ph_workflow_statuses (project_id, name, category, color, position, is_default)
  SELECT
    p_project_id,
    canonical_name,
    CASE dominant_cat
      WHEN 'To Do' THEN 'todo'
      WHEN 'In Progress' THEN 'in_progress'
      WHEN 'Done' THEN 'done'
      ELSE 'todo'
    END,
    CASE dominant_cat
      WHEN 'To Do' THEN '#DDDEE1'
      WHEN 'In Progress' THEN '#8FB8F6'
      WHEN 'Done' THEN '#94C748'
      ELSE '#DDDEE1'
    END,
    pos::int,
    false
  FROM (
    SELECT
      canonical_name,
      dominant_cat,
      ROW_NUMBER() OVER (ORDER BY total_cnt DESC, status_lower) AS pos
    FROM (
      SELECT
        status_lower,
        (ARRAY_AGG(status ORDER BY cnt DESC))[1] AS canonical_name,
        (ARRAY_AGG(status_category ORDER BY cnt DESC))[1] AS dominant_cat,
        SUM(cnt) AS total_cnt
      FROM (
        SELECT LOWER(status) AS status_lower, status, status_category, COUNT(*) AS cnt
        FROM ph_issues
        WHERE project_key = v_project_key
          AND status IS NOT NULL
          AND status_category IS NOT NULL
        GROUP BY LOWER(status), status, status_category
      ) raw
      GROUP BY status_lower
    ) deduped
  ) final;

  -- Insert type-status mappings (join on LOWER to match canonical)
  INSERT INTO ph_workflow_type_statuses (project_id, work_item_type, status_id, position, is_initial)
  SELECT
    p_project_id,
    work_item_type,
    status_id,
    (ROW_NUMBER() OVER (PARTITION BY work_item_type ORDER BY usage_count DESC) - 1)::int,
    false
  FROM (
    SELECT
      i.issue_type AS work_item_type,
      s.id AS status_id,
      COUNT(*) AS usage_count
    FROM ph_issues i
    JOIN ph_workflow_statuses s
      ON s.project_id = p_project_id
      AND LOWER(s.name) = LOWER(i.status)
    WHERE i.project_key = v_project_key
      AND i.issue_type IS NOT NULL
      AND i.status IS NOT NULL
    GROUP BY i.issue_type, s.id
  ) usage
  ON CONFLICT (project_id, work_item_type, status_id) DO NOTHING;
END;
$$;

SELECT public.fn_reset_project_workflow('84f91caf-7511-470a-9a26-3e52e66258bf'::uuid);
