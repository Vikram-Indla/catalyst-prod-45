-- Update soft-delete RPC to support legacy incidents without project_id
CREATE OR REPLACE FUNCTION public.soft_delete_incident(p_incident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_created_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT project_id, created_by
  INTO v_project_id, v_created_by
  FROM public.incidents
  WHERE id = p_incident_id;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Authorization:
  -- 1) If incident has a project, user must be in that project (admins included via user_in_project)
  -- 2) If incident has no project (legacy), allow creator or admin
  IF v_project_id IS NOT NULL THEN
    IF NOT public.user_in_project(auth.uid(), v_project_id) THEN
      RAISE EXCEPTION 'Not authorized to delete this incident';
    END IF;
  ELSE
    IF auth.uid() <> v_created_by AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Not authorized to delete this incident';
    END IF;
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