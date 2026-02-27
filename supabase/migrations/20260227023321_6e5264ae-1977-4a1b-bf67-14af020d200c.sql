
-- ═══ INDEXES FOR HOT QUERY PATHS ═══

-- ph_issues: primary query columns for intelligence
CREATE INDEX IF NOT EXISTS idx_ph_issues_assignee_updated 
  ON public.ph_issues (assignee_account_id, jira_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ph_issues_assignee_status 
  ON public.ph_issues (assignee_account_id, status);

CREATE INDEX IF NOT EXISTS idx_ph_issues_project_status 
  ON public.ph_issues (project_name, status);

-- r360_ai_cache: primary lookup pattern
CREATE INDEX IF NOT EXISTS idx_r360_ai_cache_lookup 
  ON public.r360_ai_cache (scope_type, scope_id, section, week_start);

-- r360_resource_metrics: department aggregation
CREATE INDEX IF NOT EXISTS idx_r360_resource_metrics_resource 
  ON public.r360_resource_metrics (resource_id);

-- resource_inventory: department filtering
CREATE INDEX IF NOT EXISTS idx_resource_inventory_dept_active 
  ON public.resource_inventory (department_name, is_active);

-- r360_ai_jobs: queue processing
CREATE INDEX IF NOT EXISTS idx_r360_ai_jobs_queue 
  ON public.r360_ai_jobs (status, priority, created_at);

-- ═══ MATERIALIZED VIEW: Pre-aggregated department metrics ═══

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dept_intelligence_stats AS
SELECT 
  ri.department_name,
  COUNT(DISTINCT ri.id) AS resource_count,
  COALESCE(SUM(rm.total_items), 0) AS total_items,
  COALESCE(SUM(rm.done_count), 0) AS done_count,
  COALESCE(SUM(rm.in_progress_count), 0) AS in_progress_count,
  COALESCE(SUM(rm.todo_count), 0) AS todo_count,
  CASE WHEN SUM(rm.total_items) > 0 
    THEN ROUND((SUM(rm.done_count)::numeric / SUM(rm.total_items)) * 100, 1) 
    ELSE 0 
  END AS closure_rate,
  array_agg(DISTINCT ri.id) AS resource_ids,
  array_agg(DISTINCT ri.jira_account_id) FILTER (WHERE ri.jira_account_id IS NOT NULL) AS jira_account_ids,
  now() AS refreshed_at
FROM public.resource_inventory ri
LEFT JOIN public.r360_resource_metrics rm ON rm.resource_id = ri.id
WHERE ri.is_active = true 
  AND ri.department_name IS NOT NULL
GROUP BY ri.department_name;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dept_intel_dept 
  ON public.mv_dept_intelligence_stats (department_name);

-- ═══ FUNCTION: Refresh the materialized view ═══

CREATE OR REPLACE FUNCTION public.refresh_dept_intelligence_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dept_intelligence_stats;
END;
$$;
