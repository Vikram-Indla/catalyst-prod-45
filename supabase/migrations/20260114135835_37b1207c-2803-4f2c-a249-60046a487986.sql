-- Robust soft-delete via security definer RPC (avoids client-side RLS edge cases)

CREATE OR REPLACE FUNCTION public.soft_delete_planner_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.planner_tasks
  SET deleted_at = now(),
      updated_at = now()
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_planner_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_planner_task(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.soft_delete_planner_tasks(p_task_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.planner_tasks
  SET deleted_at = now(),
      updated_at = now()
  WHERE id = ANY(p_task_ids);

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_planner_tasks(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_planner_tasks(uuid[]) TO authenticated;