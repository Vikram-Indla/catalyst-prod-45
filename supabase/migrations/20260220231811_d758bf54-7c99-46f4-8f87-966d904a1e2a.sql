DROP FUNCTION IF EXISTS get_project_team(UUID);

CREATE OR REPLACE FUNCTION get_project_team(p_project_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  job_role TEXT,
  department_name TEXT,
  avatar_url TEXT,
  country TEXT,
  location TEXT,
  project_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT
      pr.id AS user_id,
      pr.full_name,
      pr.email,
      pr.role AS job_role,
      COALESCE(d.name, 'Unassigned') AS department_name,
      pr.avatar_url,
      pr.country,
      pr.location,
      pm.role AS project_role
    FROM project_members pm
    JOIN profiles pr ON pr.id = pm.user_id
    LEFT JOIN departments d ON d.id = pr.department_id
    WHERE pm.project_id = p_project_id
    ORDER BY pr.full_name;
END;
$$;
