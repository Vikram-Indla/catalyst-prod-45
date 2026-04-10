-- Governance sync skip log table
CREATE TABLE IF NOT EXISTS public.governance_sync_skip_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL,
  skip_source TEXT NOT NULL DEFAULT 'webhook',
  jira_payload JSONB,
  skipped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.governance_sync_skip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on governance_sync_skip_log"
  ON public.governance_sync_skip_log FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_gov_skip_log_item_key ON public.governance_sync_skip_log(item_key);
CREATE INDEX idx_gov_skip_log_skipped_at ON public.governance_sync_skip_log(skipped_at DESC);

-- governance_exclusion_check: returns TRUE if item_key is governance-locked
CREATE OR REPLACE FUNCTION public.governance_exclusion_check(p_item_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM governance_closure_log
    WHERE item_key = p_item_key
      AND restored_at IS NULL
  );
$$;

-- governance_locked_keys: given array of keys, returns locked ones
CREATE OR REPLACE FUNCTION public.governance_locked_keys(p_item_keys TEXT[])
RETURNS TABLE(locked_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT item_key AS locked_key
  FROM governance_closure_log
  WHERE item_key = ANY(p_item_keys)
    AND restored_at IS NULL;
$$;

-- governance_force_close: creates lock, updates ph_issues, returns log id
CREATE OR REPLACE FUNCTION public.governance_force_close(
  p_issue_id UUID,
  p_item_key TEXT,
  p_closed_by UUID,
  p_category TEXT,
  p_stale_days INT,
  p_closure_reason TEXT,
  p_original_status TEXT,
  p_jira_attempted BOOLEAN DEFAULT false,
  p_jira_success BOOLEAN DEFAULT false,
  p_jira_error TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_restore_deadline TIMESTAMPTZ := now() + INTERVAL '90 days';
BEGIN
  -- Insert governance lock
  INSERT INTO governance_closure_log (
    item_key, issue_id, closed_by, closed_at,
    governance_category, stale_days, closure_reason,
    restore_deadline, original_status, restored_at,
    metadata
  ) VALUES (
    p_item_key, p_issue_id, p_closed_by, now(),
    CASE WHEN p_category ~ '^\d+$' THEN p_category::INT ELSE NULL END,
    p_stale_days, p_closure_reason,
    v_restore_deadline, p_original_status, NULL,
    jsonb_build_object(
      'jira_attempted', p_jira_attempted,
      'jira_success', p_jira_success,
      'jira_error', p_jira_error
    )
  )
  RETURNING id INTO v_log_id;

  -- Update ph_issues to governance-closed status
  UPDATE ph_issues SET
    status = 'GOVERNANCE_CLOSED',
    status_category = 'done'
  WHERE id = p_issue_id;

  -- Also update catalyst_issues if row exists
  UPDATE catalyst_issues SET
    status = 'done',
    closure_method = 'force_bypass',
    force_closed_by = p_closed_by,
    force_closed_at = now(),
    force_close_reason = p_closure_reason,
    restore_deadline = v_restore_deadline
  WHERE id = p_issue_id;

  RETURN v_log_id;
END;
$$;

-- governance_restore: unlocks governance entry, restores original status
CREATE OR REPLACE FUNCTION public.governance_restore(
  p_log_id UUID,
  p_restored_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_id UUID;
  v_original_status TEXT;
BEGIN
  -- Mark as restored
  UPDATE governance_closure_log
  SET restored_at = now(), restored_by = p_restored_by
  WHERE id = p_log_id AND restored_at IS NULL
  RETURNING issue_id, original_status
  INTO v_issue_id, v_original_status;

  IF v_issue_id IS NULL THEN
    RAISE EXCEPTION 'Log entry not found or already restored';
  END IF;

  -- Restore ph_issues status
  UPDATE ph_issues SET
    status = COALESCE(v_original_status, 'To Do'),
    status_category = 'new'
  WHERE id = v_issue_id;

  -- Restore catalyst_issues if exists
  UPDATE catalyst_issues SET
    status = COALESCE(v_original_status, 'To Do'),
    closure_method = 'normal',
    force_closed_by = NULL,
    force_closed_at = NULL
  WHERE id = v_issue_id;
END;
$$;