
-- Fix the view to use SECURITY INVOKER (respects RLS of querying user)
DROP VIEW IF EXISTS public.v_tm_test_cycle_list_metrics;

CREATE VIEW public.v_tm_test_cycle_list_metrics
WITH (security_invoker = on)
AS
SELECT
  c.id,
  c.project_id,
  c.cycle_key,
  c.name,
  c.description,
  c.status,
  c.environment,
  c.release_id,
  c.assigned_to,
  c.planned_start,
  c.planned_end,
  c.actual_start,
  c.actual_end,
  c.created_at,
  c.updated_at,
  c.created_by,
  
  -- Derived from tm_cycle_scope (source of truth for test count)
  COALESCE(scope_metrics.tests_count, 0)::integer AS tests_count,
  
  -- Derived from tm_test_runs via tm_cycle_scope
  COALESCE(run_metrics.runs_total, 0)::integer AS runs_total,
  COALESCE(run_metrics.runs_passed, 0)::integer AS runs_passed,
  COALESCE(run_metrics.runs_failed, 0)::integer AS runs_failed,
  COALESCE(run_metrics.runs_blocked, 0)::integer AS runs_blocked,
  COALESCE(run_metrics.runs_skipped, 0)::integer AS runs_skipped,
  
  -- Progress: runs_completed / tests_count (each test case should be run at least once)
  CASE 
    WHEN COALESCE(scope_metrics.tests_count, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(run_metrics.unique_cases_executed, 0)::numeric / scope_metrics.tests_count::numeric) * 100
    )::integer
  END AS progress_pct,
  
  -- Pass rate: passed / (passed + failed) - only count final verdict per test case
  CASE 
    WHEN (COALESCE(run_metrics.runs_passed, 0) + COALESCE(run_metrics.runs_failed, 0)) = 0 THEN NULL
    ELSE ROUND(
      (COALESCE(run_metrics.runs_passed, 0)::numeric / 
       (COALESCE(run_metrics.runs_passed, 0) + COALESCE(run_metrics.runs_failed, 0))::numeric) * 100
    )::integer
  END AS pass_rate_pct,
  
  -- Effective updated_at (latest of cycle, scope, or runs)
  GREATEST(
    c.updated_at,
    COALESCE(scope_metrics.latest_scope_update, c.updated_at),
    COALESCE(run_metrics.latest_run_time, c.updated_at)
  ) AS updated_at_effective,
  
  -- Avg duration for completed runs (in seconds)
  run_metrics.avg_duration_seconds
  
FROM tm_test_cycles c

-- Scope metrics subquery
LEFT JOIN LATERAL (
  SELECT
    s.cycle_id,
    COUNT(*)::integer AS tests_count,
    MAX(s.added_at) AS latest_scope_update
  FROM tm_cycle_scope s
  WHERE s.cycle_id = c.id
  GROUP BY s.cycle_id
) scope_metrics ON true

-- Run metrics subquery  
LEFT JOIN LATERAL (
  SELECT
    COUNT(r.id)::integer AS runs_total,
    COUNT(CASE WHEN r.status = 'passed' THEN 1 END)::integer AS runs_passed,
    COUNT(CASE WHEN r.status = 'failed' THEN 1 END)::integer AS runs_failed,
    COUNT(CASE WHEN r.status = 'blocked' THEN 1 END)::integer AS runs_blocked,
    COUNT(CASE WHEN r.status = 'skipped' THEN 1 END)::integer AS runs_skipped,
    COUNT(DISTINCT CASE WHEN r.status IN ('passed', 'failed', 'blocked', 'skipped') THEN s.test_case_id END)::integer AS unique_cases_executed,
    MAX(COALESCE(r.completed_at, r.created_at)) AS latest_run_time,
    AVG(r.duration_seconds) FILTER (WHERE r.duration_seconds IS NOT NULL)::integer AS avg_duration_seconds
  FROM tm_cycle_scope s
  LEFT JOIN tm_test_runs r ON r.cycle_scope_id = s.id
  WHERE s.cycle_id = c.id
) run_metrics ON true;

-- Grant select to authenticated users
GRANT SELECT ON public.v_tm_test_cycle_list_metrics TO authenticated;

COMMENT ON VIEW public.v_tm_test_cycle_list_metrics IS 'Authoritative view for test cycle list with metrics derived from tm_cycle_scope and tm_test_runs. Uses SECURITY INVOKER to respect RLS of the querying user.';
