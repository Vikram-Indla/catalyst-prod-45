-- Create a secure soft-delete RPC to avoid RLS edge cases on incidents updates
CREATE OR REPLACE FUNCTION public.soft_delete_incident(p_incident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT project_id
  INTO v_project_id
  FROM public.incidents
  WHERE id = p_incident_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Authorization: must belong to the incident's project (admins included via user_in_project)
  IF NOT public.user_in_project(auth.uid(), v_project_id) THEN
    RAISE EXCEPTION 'Not authorized to delete this incident';
  END IF;

  UPDATE public.incidents
  SET
    deleted_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_incident_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_incident(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_incident(uuid) TO authenticated;