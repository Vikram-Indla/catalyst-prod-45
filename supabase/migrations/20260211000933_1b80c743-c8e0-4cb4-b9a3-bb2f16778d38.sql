
DROP FUNCTION IF EXISTS public.get_unassigned_cycles(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_unassigned_cycles(p_project_id UUID, p_plan_id UUID)
RETURNS TABLE(id UUID, cycle_key TEXT, name TEXT, status TEXT, total_cases INT, passed_count INT, failed_count INT, blocked_count INT)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.cycle_key::TEXT,
    c.name::TEXT,
    c.status::TEXT,
    COALESCE(c.total_cases, 0)::INT,
    COALESCE(c.passed_count, 0)::INT,
    COALESCE(c.failed_count, 0)::INT,
    COALESCE(c.blocked_count, 0)::INT
  FROM th_test_cycles c
  WHERE c.id NOT IN (SELECT pc.cycle_id FROM th_plan_cycles pc WHERE pc.plan_id = p_plan_id)
  ORDER BY c.created_at DESC;
$$;
