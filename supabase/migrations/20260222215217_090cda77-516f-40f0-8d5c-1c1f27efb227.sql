
-- 1. Pre-computed metrics table
CREATE TABLE IF NOT EXISTS public.r360_resource_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL,
  metrics_hash TEXT,
  delivery_metrics JSONB NOT NULL DEFAULT '{}',
  hub_distribution JSONB NOT NULL DEFAULT '{}',
  hub_closure_rates JSONB NOT NULL DEFAULT '{}',
  status_distribution JSONB NOT NULL DEFAULT '{}',
  type_distribution JSONB NOT NULL DEFAULT '{}',
  priority_distribution JSONB NOT NULL DEFAULT '{}',
  total_items INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  in_progress_count INTEGER NOT NULL DEFAULT 0,
  todo_count INTEGER NOT NULL DEFAULT 0,
  weekly_closure_history JSONB NOT NULL DEFAULT '[]',
  release_standings JSONB NOT NULL DEFAULT '[]',
  recent_items JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_generated_at TIMESTAMP WITH TIME ZONE,
  recompute_needed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT r360_resource_metrics_resource_id_unique UNIQUE (resource_id)
);

CREATE INDEX IF NOT EXISTS idx_r360_resource_metrics_recompute ON r360_resource_metrics (recompute_needed) WHERE recompute_needed = true;

ALTER TABLE r360_resource_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON r360_resource_metrics;
CREATE POLICY "Allow read for authenticated" ON r360_resource_metrics FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow service role all" ON r360_resource_metrics;
CREATE POLICY "Allow service role all" ON r360_resource_metrics FOR ALL USING (true) WITH CHECK (true);

-- 2. Unified activity view (skip if required tables are missing)
DROP VIEW IF EXISTS public.r360_unified_activity_view;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ph_work_items') THEN
    RAISE NOTICE 'ph_work_items not found, skipping r360_unified_activity_view';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planhub_tasks') THEN
    RAISE NOTICE 'planhub_tasks not found, skipping r360_unified_activity_view';
    RETURN;
  END IF;
  EXECUTE $view$
    CREATE VIEW public.r360_unified_activity_view AS

    SELECT ph.issue_key AS item_id, 'jira' AS hub_source, ph.issue_type AS item_type,
      ph.summary AS title, ph.status,
      CASE WHEN ph.status_category = 'Done' THEN 'done' WHEN ph.status_category = 'In Progress' THEN 'in_progress' ELSE 'todo' END AS status_category,
      ph.priority, ph.assignee_account_id AS assignee_jira_id, NULL::uuid AS assignee_user_id,
      ph.project_name, ph.project_key, ph.fix_versions,
      ph.jira_created_at AS created_at, ph.jira_updated_at AS updated_at,
      CASE WHEN ph.status_category = 'Done' THEN ph.jira_updated_at ELSE NULL END AS resolved_at,
      ph.due_date, ph.story_points, ph.parent_key, ph.parent_summary, ph.description_text
    FROM ph_issues ph

    UNION ALL

    SELECT pw.item_key, 'producthub', pw.item_type, COALESCE(pw.title, pw.summary), pw.status,
      CASE WHEN pw.resolved_at IS NOT NULL OR pw.completed_at IS NOT NULL THEN 'done' WHEN pw.status ILIKE '%progress%' OR pw.status ILIKE '%review%' THEN 'in_progress' ELSE 'todo' END,
      pw.priority, NULL, pw.assignee_id, NULL, NULL, NULL::jsonb,
      pw.created_at, pw.updated_at, COALESCE(pw.resolved_at, pw.completed_at),
      pw.due_date, pw.story_points, NULL, NULL, pw.description
    FROM ph_work_items pw

    UNION ALL

    SELECT td.defect_key::text, 'testhub', 'Defect', td.title::text, td.status::text,
      CASE WHEN td.resolved_at IS NOT NULL THEN 'done' WHEN td.status::text ILIKE '%progress%' THEN 'in_progress' ELSE 'todo' END,
      td.priority::text, NULL, td.assigned_to, NULL, NULL, NULL::jsonb,
      td.created_at, td.updated_at, td.resolved_at, td.due_date, NULL::numeric, NULL, NULL, td.description
    FROM th_defects td

    UNION ALL

    SELECT tmd.defect_key::text, 'testhub', 'Defect', tmd.title::text, tmd.status::text,
      CASE WHEN tmd.resolved_at IS NOT NULL THEN 'done' WHEN tmd.status::text ILIKE '%progress%' THEN 'in_progress' ELSE 'todo' END,
      tmd.priority::text, NULL, tmd.assignee_id, NULL, NULL, NULL::jsonb,
      tmd.created_at, tmd.updated_at, tmd.resolved_at, tmd.due_date, NULL::numeric, NULL, NULL, tmd.description
    FROM tm_defects tmd

    UNION ALL

    SELECT inc.incident_key, 'incidents', COALESCE(inc.incident_type, 'Incident'), inc.title, inc.status::text,
      CASE WHEN inc.resolved_at IS NOT NULL OR inc.closed_at IS NOT NULL THEN 'done' WHEN inc.status::text ILIKE '%progress%' THEN 'in_progress' ELSE 'todo' END,
      inc.priority::text, NULL, inc.assignee_id, NULL, NULL, NULL::jsonb,
      inc.created_at, inc.updated_at, COALESCE(inc.resolved_at, inc.closed_at),
      inc.target_date, NULL::numeric, NULL, NULL, inc.description
    FROM incidents inc WHERE inc.deleted_at IS NULL

    UNION ALL

    SELECT pt.id::text, 'planner', 'Task', pt.title::text, ps.name,
      CASE WHEN ps.name = 'Done' THEN 'done' WHEN ps.name IN ('In Progress', 'Review', 'Testing') THEN 'in_progress' ELSE 'todo' END,
      pt.priority::text, NULL, pt.assignee_id, ws.name, NULL, NULL::jsonb,
      pt.created_at, pt.updated_at, NULL::timestamptz, pt.due_date, NULL::numeric, NULL, NULL, NULL
    FROM planner_tasks pt
    LEFT JOIN planner_statuses ps ON ps.id = pt.status_id
    LEFT JOIN planner_workstreams ws ON ws.id = pt.workstream_id

    UNION ALL

    SELECT pht.id::text, 'planhub', pht.type::text, pht.name,
      CASE WHEN pht.progress >= 100 THEN 'Done' WHEN pht.progress > 0 THEN 'In Progress' ELSE 'Not Started' END,
      CASE WHEN pht.progress >= 100 THEN 'done' WHEN pht.progress > 0 THEN 'in_progress' ELSE 'todo' END,
      NULL, NULL, pht.assignee_id, NULL, NULL, NULL::jsonb,
      pht.created_at, pht.updated_at, CASE WHEN pht.progress >= 100 THEN pht.updated_at ELSE NULL END,
      pht.end_date, NULL::numeric, NULL, NULL, NULL
    FROM planhub_tasks pht
  $view$;
END $$;

COMMENT ON VIEW r360_unified_activity_view IS 'Unified cross-hub activity view for Resource 360 metrics. Sources: jira, producthub, testhub, incidents, planner, planhub.';
