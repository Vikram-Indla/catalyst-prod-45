-- Update tm_user_has_access function to be more permissive
-- Allow authenticated users to access projects if:
-- 1. They have a role in tm_user_roles, OR
-- 2. They are a member of a team in tm_teams (for the project), OR
-- 3. The project exists and user is authenticated (fallback for demo)

CREATE OR REPLACE FUNCTION public.tm_user_has_access(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check tm_user_roles first
  IF EXISTS (
    SELECT 1 FROM tm_user_roles 
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a team member in the project
  IF EXISTS (
    SELECT 1 FROM tm_team_members tm
    JOIN tm_teams t ON tm.team_id = t.id
    WHERE tm.user_id = p_user_id AND t.project_id = p_project_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: Allow authenticated users to access any project
  -- This is permissive for development but should be restricted in production
  IF p_project_id IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;