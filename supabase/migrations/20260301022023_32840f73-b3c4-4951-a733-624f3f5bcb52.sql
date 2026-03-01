
CREATE OR REPLACE FUNCTION public.r360_detect_significant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_id TEXT;
  v_department TEXT;
  v_is_significant BOOLEAN := FALSE;
  v_reason TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_resource_id := NEW.assignee_account_id;
    v_is_significant := TRUE;
    v_reason := 'new_issue_assigned';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_is_significant := TRUE;
      v_reason := 'status_changed:' || COALESCE(OLD.status,'null') || '->' || NEW.status;
      v_resource_id := NEW.assignee_account_id;
    END IF;
    IF OLD.assignee_account_id IS DISTINCT FROM NEW.assignee_account_id THEN
      v_is_significant := TRUE;
      v_reason := 'reassigned';
      IF OLD.assignee_account_id IS NOT NULL THEN
        PERFORM public.r360_mark_resource_stale(OLD.assignee_account_id, 'reassigned_away');
      END IF;
      v_resource_id := NEW.assignee_account_id;
    END IF;
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_is_significant := TRUE;
      v_reason := 'soft_deleted';
      v_resource_id := NEW.assignee_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.assignee_account_id;
    v_is_significant := TRUE;
    v_reason := 'hard_deleted';
  END IF;

  IF v_is_significant AND v_resource_id IS NOT NULL THEN
    SELECT department INTO v_department
    FROM public.resource_inventory
    WHERE id::text = v_resource_id
    LIMIT 1;

    PERFORM public.r360_mark_resource_stale(v_resource_id, v_reason);

    IF v_department IS NOT NULL THEN
      PERFORM public.r360_mark_department_stale(v_department, v_reason);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
