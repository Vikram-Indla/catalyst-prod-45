
-- Add display_status column to support Planning, On Hold, etc.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS display_status text DEFAULT 'active';

-- Drop and recreate view to change column type
DROP VIEW IF EXISTS public.v_project_list;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RAISE NOTICE 'project_members not found, skipping v_project_list';
    RETURN;
  END IF;
  EXECUTE $view$
    CREATE VIEW public.v_project_list AS
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
    WHERE p.status = 'active'::program_status
    ORDER BY p.updated_at DESC
  $view$;
END $$;

-- Set correct display statuses per reference image
UPDATE projects SET display_status = 'planning' WHERE key = 'AI';
UPDATE projects SET display_status = 'on_hold' WHERE key = 'SC';
UPDATE projects SET display_status = 'planning' WHERE key = 'QC';
UPDATE projects SET display_status = 'active' WHERE key NOT IN ('AI', 'SC', 'QC');

-- Fix status_category to match reference
UPDATE projects SET status_category = 'in_progress' WHERE key IN ('CB', 'DT', 'IA', 'LP', 'MP', 'RE', 'SM', 'WM', 'IPM');
UPDATE projects SET status_category = 'todo' WHERE key IN ('AI', 'QC', 'SC');

-- Fix health_status to match reference
UPDATE projects SET health_status = 'on_track' WHERE key IN ('DT', 'IA', 'LP', 'QC', 'RE', 'WM');
UPDATE projects SET health_status = 'off_track' WHERE key = 'CB';
UPDATE projects SET health_status = 'at_risk' WHERE key IN ('MP', 'SM', 'SC');
