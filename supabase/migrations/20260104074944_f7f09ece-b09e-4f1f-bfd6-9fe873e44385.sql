-- =====================================================
-- SECURITY FIXES: Set search_path and fix views
-- =====================================================

-- Fix functions with explicit search_path
CREATE OR REPLACE FUNCTION tm_update_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tm_next_entity_key(p_project_id UUID, p_prefix VARCHAR(10))
RETURNS VARCHAR(20) 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO tm_key_sequences (project_id, prefix, current_value)
  VALUES (p_project_id, p_prefix, 1)
  ON CONFLICT (project_id, prefix) 
  DO UPDATE SET current_value = tm_key_sequences.current_value + 1, updated_at = now()
  RETURNING current_value INTO v_next;
  
  RETURN p_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION tm_calculate_run_status(p_run_id UUID)
RETURNS tm_execution_status 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status tm_execution_status;
BEGIN
  SELECT 
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'blocked') > 0 THEN 'blocked'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'in_progress') > 0 THEN 'in_progress'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'not_run') = COUNT(*) THEN 'not_run'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status IN ('passed', 'skipped')) = COUNT(*) THEN 'passed'::tm_execution_status
      ELSE 'in_progress'::tm_execution_status
    END INTO v_status
  FROM tm_step_results
  WHERE test_run_id = p_run_id;
  
  RETURN COALESCE(v_status, 'not_run');
END;
$$;

CREATE OR REPLACE FUNCTION tm_update_cycle_stats(p_cycle_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE tm_test_cycles SET
    total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id),
    passed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'passed'),
    failed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'failed'),
    blocked_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'blocked'),
    skipped_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'skipped'),
    not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'not_run'),
    updated_at = now()
  WHERE id = p_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION tm_update_folder_counts(p_folder_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_folder_id IS NOT NULL THEN
    UPDATE tm_folders SET
      case_count = (SELECT COUNT(*) FROM tm_test_cases WHERE folder_id = p_folder_id),
      updated_at = now()
    WHERE id = p_folder_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION tm_check_circular_folder(p_folder_id UUID, p_new_parent_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_id UUID;
BEGIN
  IF p_new_parent_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_folder_id = p_new_parent_id THEN
    RETURN TRUE;
  END IF;
  
  v_current_id := p_new_parent_id;
  WHILE v_current_id IS NOT NULL LOOP
    IF v_current_id = p_folder_id THEN
      RETURN TRUE;
    END IF;
    SELECT parent_id INTO v_current_id FROM tm_folders WHERE id = v_current_id;
  END LOOP;
  
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION tm_trigger_update_folder_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM tm_update_folder_counts(OLD.folder_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM tm_update_folder_counts(NEW.folder_id);
    RETURN NEW;
  ELSE
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      PERFORM tm_update_folder_counts(OLD.folder_id);
      PERFORM tm_update_folder_counts(NEW.folder_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION tm_trigger_step_results_percolate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_run_status tm_execution_status;
  v_scope_id UUID;
BEGIN
  v_run_status := tm_calculate_run_status(NEW.test_run_id);
  
  UPDATE tm_test_runs SET status = v_run_status, updated_at = now()
  WHERE id = NEW.test_run_id
  RETURNING cycle_scope_id INTO v_scope_id;
  
  UPDATE tm_cycle_scope SET current_status = v_run_status
  WHERE id = v_scope_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tm_trigger_cycle_scope_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM tm_update_cycle_stats(OLD.cycle_id);
    RETURN OLD;
  ELSE
    PERFORM tm_update_cycle_stats(NEW.cycle_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION tm_user_has_access(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tm_user_roles 
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$;

-- Recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS v_tm_test_cases_full;
CREATE VIEW v_tm_test_cases_full 
WITH (security_invoker = true)
AS
SELECT 
  tc.*,
  p.name AS project_name,
  p.key AS project_key,
  f.name AS folder_name,
  f.path AS folder_path,
  cp.name AS priority_name,
  cp.color AS priority_color,
  ct.name AS type_name,
  ct.color AS type_color,
  creator.full_name AS created_by_name,
  COALESCE(
    (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
     FROM tm_case_labels cl JOIN tm_labels l ON cl.label_id = l.id
     WHERE cl.test_case_id = tc.id), '[]'::json
  ) AS labels,
  (SELECT COUNT(*) FROM tm_test_steps WHERE test_case_id = tc.id) AS step_count
FROM tm_test_cases tc
LEFT JOIN tm_projects p ON tc.project_id = p.id
LEFT JOIN tm_folders f ON tc.folder_id = f.id
LEFT JOIN tm_case_priorities cp ON tc.priority_id = cp.id
LEFT JOIN tm_case_types ct ON tc.case_type_id = ct.id
LEFT JOIN profiles creator ON tc.created_by = creator.id;

DROP VIEW IF EXISTS v_tm_cycle_progress;
CREATE VIEW v_tm_cycle_progress 
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  p.name AS project_name,
  p.key AS project_key,
  e.name AS environment_name,
  creator.full_name AS created_by_name,
  CASE 
    WHEN c.total_cases = 0 THEN 0
    ELSE ROUND(((c.passed_count + c.skipped_count)::NUMERIC / c.total_cases) * 100, 2)
  END AS progress_percent,
  CASE
    WHEN c.status = 'completed' THEN 'completed'
    WHEN c.planned_end < now() AND c.status != 'completed' THEN 'overdue'
    WHEN c.planned_start > now() THEN 'upcoming'
    ELSE 'on_track'
  END AS schedule_status
FROM tm_test_cycles c
LEFT JOIN tm_projects p ON c.project_id = p.id
LEFT JOIN tm_environments e ON c.environment_id = e.id
LEFT JOIN profiles creator ON c.created_by = creator.id;

DROP VIEW IF EXISTS v_tm_execution_by_assignee;
CREATE VIEW v_tm_execution_by_assignee 
WITH (security_invoker = true)
AS
SELECT 
  cs.assigned_to AS user_id,
  u.full_name AS assignee_name,
  c.id AS cycle_id,
  c.name AS cycle_name,
  c.project_id,
  COUNT(*) AS total_assigned,
  COUNT(*) FILTER (WHERE cs.current_status = 'passed') AS passed,
  COUNT(*) FILTER (WHERE cs.current_status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE cs.current_status = 'blocked') AS blocked,
  COUNT(*) FILTER (WHERE cs.current_status = 'not_run') AS not_run,
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE cs.current_status NOT IN ('not_run', 'in_progress'))::NUMERIC / COUNT(*)) * 100, 2)
  END AS completion_percent
FROM tm_cycle_scope cs
JOIN tm_test_cycles c ON cs.cycle_id = c.id
LEFT JOIN profiles u ON cs.assigned_to = u.id
WHERE cs.assigned_to IS NOT NULL
GROUP BY cs.assigned_to, u.full_name, c.id, c.name, c.project_id;

DROP VIEW IF EXISTS v_tm_traceability_summary;
CREATE VIEW v_tm_traceability_summary 
WITH (security_invoker = true)
AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.key AS project_key,
  (SELECT COUNT(*) FROM tm_test_cases WHERE project_id = p.id) AS total_cases,
  (SELECT COUNT(*) FROM tm_test_cases WHERE project_id = p.id AND status = 'approved') AS approved_cases,
  (SELECT COUNT(*) FROM tm_test_cycles WHERE project_id = p.id) AS total_cycles,
  (SELECT COUNT(*) FROM tm_test_cycles WHERE project_id = p.id AND status = 'completed') AS completed_cycles,
  (SELECT COUNT(*) FROM tm_defects WHERE project_id = p.id AND status = 'open') AS open_defects
FROM tm_projects p
WHERE p.is_active = true;

DROP VIEW IF EXISTS v_tm_my_work;
CREATE VIEW v_tm_my_work 
WITH (security_invoker = true)
AS
SELECT 
  cs.assigned_to AS user_id,
  'cycle_scope' AS work_type,
  cs.id AS item_id,
  tc.case_key AS item_key,
  tc.title AS item_title,
  cs.current_status AS status,
  c.name AS context_name,
  c.id AS context_id,
  c.planned_end AS due_date,
  CASE
    WHEN c.planned_end < now() THEN 'overdue'
    WHEN c.planned_end < now() + INTERVAL '2 days' THEN 'due_soon'
    ELSE 'normal'
  END AS urgency,
  cs.added_at AS assigned_at
FROM tm_cycle_scope cs
JOIN tm_test_cycles c ON cs.cycle_id = c.id
JOIN tm_test_cases tc ON cs.test_case_id = tc.id
WHERE cs.current_status IN ('not_run', 'in_progress', 'blocked')
  AND c.status IN ('planned', 'in_progress');

-- Enable RLS on remaining tables that need it
ALTER TABLE tm_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_case_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_set_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_cycle_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_defect_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_ai_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_case_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_case_types ENABLE ROW LEVEL SECURITY;

-- Policies for folders
CREATE POLICY tm_folders_select ON tm_folders FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_folders_insert ON tm_folders FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_folders_update ON tm_folders FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_folders_delete ON tm_folders FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Policies for test_steps (via test_case -> project)
CREATE POLICY tm_test_steps_select ON tm_test_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));
CREATE POLICY tm_test_steps_insert ON tm_test_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));
CREATE POLICY tm_test_steps_update ON tm_test_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));
CREATE POLICY tm_test_steps_delete ON tm_test_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));

-- Policies for cycle_scope (via cycle -> project)
CREATE POLICY tm_cycle_scope_select ON tm_cycle_scope FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cycles c 
    WHERE c.id = cycle_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_cycle_scope_insert ON tm_cycle_scope FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_cycles c 
    WHERE c.id = cycle_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_cycle_scope_update ON tm_cycle_scope FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tm_test_cycles c 
    WHERE c.id = cycle_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_cycle_scope_delete ON tm_cycle_scope FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_test_cycles c 
    WHERE c.id = cycle_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));

-- Policies for test_runs (via cycle_scope -> cycle -> project)
CREATE POLICY tm_test_runs_select ON tm_test_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_cycle_scope cs 
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE cs.id = cycle_scope_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_test_runs_insert ON tm_test_runs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_cycle_scope cs 
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE cs.id = cycle_scope_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_test_runs_update ON tm_test_runs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tm_cycle_scope cs 
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE cs.id = cycle_scope_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_test_runs_delete ON tm_test_runs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_cycle_scope cs 
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE cs.id = cycle_scope_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));

-- Policies for step_results (via test_run -> cycle_scope -> cycle -> project)
CREATE POLICY tm_step_results_select ON tm_step_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE tr.id = test_run_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_step_results_insert ON tm_step_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE tr.id = test_run_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_step_results_update ON tm_step_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE tr.id = test_run_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));
CREATE POLICY tm_step_results_delete ON tm_step_results FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    JOIN tm_test_cycles c ON cs.cycle_id = c.id
    WHERE tr.id = test_run_id AND tm_user_has_access(auth.uid(), c.project_id)
  ));

-- Policies for test_sets
CREATE POLICY tm_test_sets_select ON tm_test_sets FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_sets_insert ON tm_test_sets FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_sets_update ON tm_test_sets FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_sets_delete ON tm_test_sets FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Policies for environments
CREATE POLICY tm_environments_select ON tm_environments FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_environments_insert ON tm_environments FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_environments_update ON tm_environments FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_environments_delete ON tm_environments FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Policies for labels
CREATE POLICY tm_labels_select ON tm_labels FOR SELECT
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_labels_insert ON tm_labels FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_labels_update ON tm_labels FOR UPDATE
  USING (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_labels_delete ON tm_labels FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Policies for case_priorities
CREATE POLICY tm_case_priorities_select ON tm_case_priorities FOR SELECT
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_priorities_insert ON tm_case_priorities FOR INSERT
  WITH CHECK (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_priorities_update ON tm_case_priorities FOR UPDATE
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_priorities_delete ON tm_case_priorities FOR DELETE
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));

-- Policies for case_types
CREATE POLICY tm_case_types_select ON tm_case_types FOR SELECT
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_types_insert ON tm_case_types FOR INSERT
  WITH CHECK (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_types_update ON tm_case_types FOR UPDATE
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_types_delete ON tm_case_types FOR DELETE
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));

-- Policies for user_roles (users can see their own roles, admins can manage)
CREATE POLICY tm_user_roles_select ON tm_user_roles FOR SELECT
  USING (user_id = auth.uid() OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_user_roles_insert ON tm_user_roles FOR INSERT
  WITH CHECK (tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_user_roles_delete ON tm_user_roles FOR DELETE
  USING (tm_user_has_access(auth.uid(), project_id));

-- Policies for saved_filters (users own their filters)
CREATE POLICY tm_saved_filters_select ON tm_saved_filters FOR SELECT
  USING (user_id = auth.uid() OR is_shared = true);
CREATE POLICY tm_saved_filters_insert ON tm_saved_filters FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY tm_saved_filters_update ON tm_saved_filters FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY tm_saved_filters_delete ON tm_saved_filters FOR DELETE
  USING (user_id = auth.uid());

-- Policies for user_presence
CREATE POLICY tm_user_presence_select ON tm_user_presence FOR SELECT
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_user_presence_insert ON tm_user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY tm_user_presence_update ON tm_user_presence FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY tm_user_presence_delete ON tm_user_presence FOR DELETE
  USING (user_id = auth.uid());

-- Policies for audit_log (read-only for project members)
CREATE POLICY tm_audit_log_select ON tm_audit_log FOR SELECT
  USING (project_id IS NULL OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_audit_log_insert ON tm_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for attachments (via entity lookup - simplified)
CREATE POLICY tm_attachments_select ON tm_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY tm_attachments_insert ON tm_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tm_attachments_delete ON tm_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- Policies for comments (via entity lookup - simplified)
CREATE POLICY tm_comments_select ON tm_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY tm_comments_insert ON tm_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tm_comments_update ON tm_comments FOR UPDATE
  USING (author_id = auth.uid());
CREATE POLICY tm_comments_delete ON tm_comments FOR DELETE
  USING (author_id = auth.uid());

-- Policies for case_labels
CREATE POLICY tm_case_labels_select ON tm_case_labels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));
CREATE POLICY tm_case_labels_insert ON tm_case_labels FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));
CREATE POLICY tm_case_labels_delete ON tm_case_labels FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc 
    WHERE tc.id = test_case_id AND tm_user_has_access(auth.uid(), tc.project_id)
  ));

-- Policies for set_cases
CREATE POLICY tm_set_cases_select ON tm_set_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_sets ts 
    WHERE ts.id = test_set_id AND tm_user_has_access(auth.uid(), ts.project_id)
  ));
CREATE POLICY tm_set_cases_insert ON tm_set_cases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_sets ts 
    WHERE ts.id = test_set_id AND tm_user_has_access(auth.uid(), ts.project_id)
  ));
CREATE POLICY tm_set_cases_delete ON tm_set_cases FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_test_sets ts 
    WHERE ts.id = test_set_id AND tm_user_has_access(auth.uid(), ts.project_id)
  ));

-- Policies for defect_links
CREATE POLICY tm_defect_links_select ON tm_defect_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_defects d 
    WHERE d.id = defect_id AND tm_user_has_access(auth.uid(), d.project_id)
  ));
CREATE POLICY tm_defect_links_insert ON tm_defect_links FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_defects d 
    WHERE d.id = defect_id AND tm_user_has_access(auth.uid(), d.project_id)
  ));
CREATE POLICY tm_defect_links_delete ON tm_defect_links FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tm_defects d 
    WHERE d.id = defect_id AND tm_user_has_access(auth.uid(), d.project_id)
  ));

-- Policies for ai_usage_log
CREATE POLICY tm_ai_usage_log_select ON tm_ai_usage_log FOR SELECT
  USING (user_id = auth.uid() OR tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_ai_usage_log_insert ON tm_ai_usage_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policies for ai_embeddings (read for project members)
CREATE POLICY tm_ai_embeddings_select ON tm_ai_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY tm_ai_embeddings_insert ON tm_ai_embeddings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tm_ai_embeddings_update ON tm_ai_embeddings FOR UPDATE
  USING (auth.uid() IS NOT NULL);