
-- Drop and recreate v_project_list to include ph_projects (Jira-synced)
DROP VIEW IF EXISTS public.v_project_list;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RAISE NOTICE 'project_members not found, skipping v_project_list';
    RETURN;
  END IF;
  EXECUTE $view$
    CREATE VIEW public.v_project_list AS
    -- Original projects table
    SELECT p.id,
        p.key AS project_key,
        p.name,
        p.department,
        p.description,
        COALESCE(p.display_status, p.status::text) AS status,
        p.health_status,
        p.status_category,
        p.total_epics,
        p.total_stories,
        p.total_tasks,
        p.work_items_todo,
        p.work_items_in_progress,
        p.work_items_done,
        p.completion_percentage,
        p.updated_at,
        p.created_at,
        p.owner_id,
        p.priority,
        p.tags,
        COALESCE(mc.member_count, 0) AS member_count,
        mc.member_ids
    FROM projects p
    LEFT JOIN LATERAL (
        SELECT count(*)::integer AS member_count,
               array_agg(pm.user_id) AS member_ids
        FROM project_members pm
        WHERE pm.project_id = p.id
    ) mc ON true
    WHERE p.status::text = 'active'

    UNION ALL

    -- ph_projects (Jira-synced) that don't already exist in projects table
    SELECT ph.id,
        ph.key AS project_key,
        ph.name,
        ph.department,
        ph.description,
        COALESCE(ph.status, 'active') AS status,
        ph.health AS health_status,
        NULL AS status_category,
        0 AS total_epics,
        0 AS total_stories,
        0 AS total_tasks,
        0 AS work_items_todo,
        0 AS work_items_in_progress,
        0 AS work_items_done,
        0 AS completion_percentage,
        ph.updated_at,
        ph.created_at,
        ph.created_by AS owner_id,
        NULL AS priority,
        NULL AS tags,
        COALESCE(phmc.member_count, 0) AS member_count,
        phmc.member_ids
    FROM ph_projects ph
    LEFT JOIN LATERAL (
        SELECT count(*)::integer AS member_count,
               array_agg(pm.user_id) AS member_ids
        FROM ph_project_members pm
        WHERE pm.project_id = ph.id
    ) phmc ON true
    WHERE ph.is_archived = false
      AND NOT EXISTS (SELECT 1 FROM projects p2 WHERE p2.id = ph.id)

    ORDER BY updated_at DESC
  $view$;
END $$;
