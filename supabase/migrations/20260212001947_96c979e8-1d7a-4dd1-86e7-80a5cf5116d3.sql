
-- ============================================================
-- PROJECTHUB RENAME: wh_ → ph_ (tables, views, functions, triggers)
-- ============================================================

-- 1. DROP TRIGGERS (depend on functions)
DROP TRIGGER IF EXISTS wh_jira_connection_updated_trigger ON wh_jira_connection;
DROP TRIGGER IF EXISTS wh_config_updated_trigger ON wh_config;
DROP TRIGGER IF EXISTS wh_user_mapping_updated_trigger ON wh_user_mapping;
DROP TRIGGER IF EXISTS wh_themes_updated_trigger ON wh_themes;
DROP TRIGGER IF EXISTS trg_wh_jira_projects_updated ON wh_jira_projects;
DROP TRIGGER IF EXISTS trg_wh_releases_updated ON wh_releases;
DROP TRIGGER IF EXISTS trg_wh_themes_updated ON wh_themes;
DROP TRIGGER IF EXISTS trg_wh_work_items_updated ON wh_work_items;
DROP TRIGGER IF EXISTS trg_wh_resources_updated ON wh_resources;
DROP TRIGGER IF EXISTS trg_wh_update_theme_progress ON wh_work_items;

-- 2. DROP VIEWS
DROP VIEW IF EXISTS vw_wh_calendar_events CASCADE;
DROP VIEW IF EXISTS vw_wh_dashboard_kpis CASCADE;
DROP VIEW IF EXISTS vw_wh_release_progress CASCADE;
DROP VIEW IF EXISTS vw_wh_resource_utilization CASCADE;
DROP VIEW IF EXISTS vw_wh_theme_progress CASCADE;
DROP VIEW IF EXISTS vw_wh_work_items_full CASCADE;

-- 3. DROP FUNCTIONS (will be recreated with ph_ names)
DROP FUNCTION IF EXISTS fn_wh_bulk_update(uuid[], text, text, uuid);
DROP FUNCTION IF EXISTS fn_wh_get_item_tree(uuid);
DROP FUNCTION IF EXISTS fn_wh_update_theme_progress();
DROP FUNCTION IF EXISTS fn_wh_update_timestamp();
DROP FUNCTION IF EXISTS wh_config_updated();
DROP FUNCTION IF EXISTS wh_jira_connection_updated();
DROP FUNCTION IF EXISTS wh_user_mapping_updated();
DROP FUNCTION IF EXISTS wh_themes_updated();
DROP FUNCTION IF EXISTS wh_parse_version_name(text);
DROP FUNCTION IF EXISTS wh_recompute_all();
DROP FUNCTION IF EXISTS wh_prune_stale(integer);
DROP FUNCTION IF EXISTS wh_parse_and_update_versions();

-- 4. RENAME ALL TABLES
ALTER TABLE wh_at_risk_items RENAME TO ph_at_risk_items;
ALTER TABLE wh_bulk_ops_log RENAME TO ph_bulk_ops_log;
ALTER TABLE wh_comments RENAME TO ph_comments;
ALTER TABLE wh_config RENAME TO ph_config;
ALTER TABLE wh_exceptions RENAME TO ph_exceptions;
ALTER TABLE wh_issues RENAME TO ph_issues;
ALTER TABLE wh_jira_connection RENAME TO ph_jira_connection;
ALTER TABLE wh_jira_projects RENAME TO ph_jira_projects;
ALTER TABLE wh_jira_sync_log RENAME TO ph_jira_sync_log;
ALTER TABLE wh_overview_stats RENAME TO ph_overview_stats;
ALTER TABLE wh_person_workload RENAME TO ph_person_workload;
ALTER TABLE wh_release_health RENAME TO ph_release_health;
ALTER TABLE wh_releases RENAME TO ph_releases;
ALTER TABLE wh_resource_assignments RENAME TO ph_resource_assignments;
ALTER TABLE wh_resources RENAME TO ph_resources;
ALTER TABLE wh_saved_filters RENAME TO ph_saved_filters;
ALTER TABLE wh_sync_log RENAME TO ph_sync_log;
ALTER TABLE wh_theme_items RENAME TO ph_theme_items;
ALTER TABLE wh_themes RENAME TO ph_themes;
ALTER TABLE wh_user_mapping RENAME TO ph_user_mapping;
ALTER TABLE wh_versions RENAME TO ph_versions;
ALTER TABLE wh_work_items RENAME TO ph_work_items;

-- 5. RECREATE FUNCTIONS with ph_ names

CREATE OR REPLACE FUNCTION public.fn_ph_update_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_config_updated()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_jira_connection_updated()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_user_mapping_updated()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_themes_updated()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_parse_version_name(vname text)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE yr INT; mn INT; qr INT;
BEGIN
  IF vname ~ '^\d{4}\s+\d{1,2}$' THEN
    yr := (regexp_match(vname, '^(\d{4})'))[1]::INT;
    mn := (regexp_match(vname, '\s+(\d{1,2})$'))[1]::INT;
    IF mn BETWEEN 1 AND 12 THEN
      RETURN (make_date(yr, mn, 1) + interval '1 month - 1 day')::DATE;
    END IF;
  END IF;
  IF vname ~* '^\d{4}\s+Q[1-4]$' THEN
    yr := (regexp_match(vname, '^(\d{4})'))[1]::INT;
    qr := (regexp_match(vname, 'Q(\d)'))[1]::INT;
    mn := qr * 3;
    RETURN (make_date(yr, mn, 1) + interval '1 month - 1 day')::DATE;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_recompute_all()
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE max_level INT; cur_level INT;
BEGIN
  SELECT COALESCE(max(hierarchy_level), 3) INTO max_level FROM ph_issues;
  FOR cur_level IN 1..max_level LOOP
    UPDATE ph_issues i SET
      effective_due_date = COALESCE(
        i.due_date,
        (SELECT min(COALESCE(v.release_date, v.parsed_date))
         FROM ph_versions v
         WHERE v.jira_id IN (
           SELECT (elem->>'id') FROM jsonb_array_elements(i.fix_versions) AS elem
         ) AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL),
        (SELECT p.effective_due_date FROM ph_issues p WHERE p.issue_key = i.parent_key)
      ),
      effective_due_source = CASE
        WHEN i.due_date IS NOT NULL THEN 'Due Date'
        WHEN (SELECT min(COALESCE(v.release_date, v.parsed_date))
              FROM ph_versions v
              WHERE v.jira_id IN (
                SELECT (elem->>'id') FROM jsonb_array_elements(i.fix_versions) AS elem
              ) AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL) IS NOT NULL
          THEN 'FixVersion (' || (
            SELECT v.name FROM ph_versions v
            WHERE v.jira_id IN (
              SELECT (elem->>'id') FROM jsonb_array_elements(i.fix_versions) AS elem
            ) AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL
            ORDER BY COALESCE(v.release_date, v.parsed_date) LIMIT 1
          ) || ')'
        WHEN (SELECT p.effective_due_date FROM ph_issues p WHERE p.issue_key = i.parent_key) IS NOT NULL
          THEN 'Inherited from ' || i.parent_key
        ELSE 'Unscheduled'
      END
    WHERE i.hierarchy_level = cur_level;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_prune_stale(window_months integer DEFAULT 6)
RETURNS integer LANGUAGE plpgsql AS $function$
DECLARE pruned INT;
BEGIN
  DELETE FROM ph_issues
  WHERE jira_updated_at < now() - (window_months || ' months')::interval
    AND status_category = 'Done';
  GET DIAGNOSTICS pruned = ROW_COUNT;
  RETURN pruned;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ph_parse_and_update_versions()
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  UPDATE ph_versions SET parsed_date = ph_parse_version_name(name)
  WHERE release_date IS NULL AND parsed_date IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_ph_bulk_update(p_item_ids uuid[], p_field text, p_value text, p_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_count INTEGER;
BEGIN
  IF p_field = 'release_id' THEN
    UPDATE ph_work_items SET release_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'theme_id' THEN
    UPDATE ph_work_items SET theme_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'status' THEN
    UPDATE ph_work_items SET status = p_value WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'assignee_user_id' THEN
    UPDATE ph_work_items SET assignee_user_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSE
    RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO ph_bulk_ops_log (operation, affected_item_ids, field_changed, new_values, item_count, performed_by)
  VALUES ('bulk_' || p_field, p_item_ids, p_field, jsonb_build_object(p_field, p_value), v_count, p_user_id);
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_ph_get_item_tree(p_parent_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, item_key text, item_type text, summary text, status text, depth integer, parent_id uuid, release_id uuid, theme_id uuid, assignee_user_id uuid, due_date date, children_count bigint)
LANGUAGE sql STABLE AS $function$
  WITH RECURSIVE tree AS (
    SELECT wi.id, wi.item_key, wi.item_type, wi.summary, wi.status,
      0 AS depth, wi.parent_id, wi.release_id, wi.theme_id,
      wi.assignee_user_id, wi.due_date
    FROM ph_work_items wi
    WHERE (p_parent_id IS NULL AND wi.parent_id IS NULL)
       OR (p_parent_id IS NOT NULL AND wi.parent_id = p_parent_id)
    UNION ALL
    SELECT child.id, child.item_key, child.item_type, child.summary, child.status,
      tree.depth + 1, child.parent_id, child.release_id, child.theme_id,
      child.assignee_user_id, child.due_date
    FROM ph_work_items child
    JOIN tree ON child.parent_id = tree.id
  )
  SELECT t.*,
    (SELECT COUNT(*) FROM ph_work_items c WHERE c.parent_id = t.id) AS children_count
  FROM tree t
  ORDER BY t.depth, t.item_key;
$function$;

CREATE OR REPLACE FUNCTION public.fn_ph_update_theme_progress()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  UPDATE ph_themes SET progress = (
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE status = 'Done')::NUMERIC / COUNT(*)) * 100, 1)
    END
    FROM ph_work_items
    WHERE theme_id = COALESCE(NEW.theme_id, OLD.theme_id)
  )
  WHERE id = COALESCE(NEW.theme_id, OLD.theme_id);
  RETURN NEW;
END;
$function$;

-- 6. RECREATE VIEWS with ph_ names

CREATE OR REPLACE VIEW vw_ph_calendar_events AS
SELECT r.id AS entity_id, 'release'::text AS event_type,
  ((r.name || ' — '::text) || r.title) AS event_title,
  r.target_date AS event_date, r.start_date AS event_start,
  r.target_date AS event_end, r.status AS event_status,
  NULL::uuid AS assignee_user_id, NULL::text AS assignee_name,
  r.color AS event_color
FROM ph_releases r WHERE r.target_date IS NOT NULL
UNION ALL
SELECT t.id, 'theme'::text, t.name, t.start_date, t.start_date,
  t.end_date, t.status, NULL::uuid, NULL::text, t.color
FROM ph_themes t WHERE t.start_date IS NOT NULL
UNION ALL
SELECT wi.id, 'workitem'::text,
  ((wi.item_key || ' — '::text) || wi.summary),
  wi.due_date, wi.start_date, wi.due_date, wi.status,
  wi.assignee_user_id, res.name,
  CASE wi.item_type
    WHEN 'Epic' THEN '#1e40af'
    WHEN 'Story' THEN '#065f46'
    WHEN 'Bug' THEN '#dc2626'
    ELSE '#475569'
  END
FROM ph_work_items wi
LEFT JOIN ph_resources res ON wi.assignee_user_id = res.user_id
WHERE wi.due_date IS NOT NULL;

CREATE OR REPLACE VIEW vw_ph_dashboard_kpis AS
SELECT
  (SELECT count(*) FROM ph_releases WHERE status = 'Active') AS active_releases,
  (SELECT count(*) FROM ph_releases WHERE status = 'At Risk') AS at_risk_releases,
  (SELECT count(*) FROM ph_themes WHERE status = 'Active') AS active_themes,
  (SELECT count(*) FROM ph_resources WHERE is_active = true) AS total_resources,
  (SELECT count(*) FROM ph_work_items WHERE status = 'Blocked') AS blocked_items,
  (SELECT count(*) FROM ph_work_items) AS total_work_items,
  (SELECT count(*) FROM ph_work_items WHERE status = 'Done') AS done_work_items,
  (SELECT round(CASE WHEN count(*) = 0 THEN 0::numeric
    ELSE ((count(*) FILTER (WHERE status = 'Done'))::numeric / count(*)::numeric) * 100
    END, 1) FROM ph_work_items) AS overall_completion_percent,
  (SELECT count(*) FROM ph_work_items
    WHERE due_date < CURRENT_DATE AND status NOT IN ('Done', 'Cancelled')) AS overdue_items,
  (SELECT count(*) FROM ph_work_items
    WHERE due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + '7 days'::interval
    AND status NOT IN ('Done', 'Cancelled')) AS due_this_week;

CREATE OR REPLACE VIEW vw_ph_release_progress AS
SELECT r.id, r.name, r.title, r.description, r.status, r.color,
  r.start_date, r.target_date, r.actual_date, r.owner_user_id,
  count(wi.id) AS total_items,
  count(wi.id) FILTER (WHERE wi.status = 'Done') AS done_items,
  count(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress_items,
  count(wi.id) FILTER (WHERE wi.status = 'In Review') AS in_review_items,
  count(wi.id) FILTER (WHERE wi.status = 'Blocked') AS blocked_items,
  count(wi.id) FILTER (WHERE wi.status = 'To Do') AS todo_items,
  CASE WHEN count(wi.id) = 0 THEN 0::numeric
    ELSE round(((count(wi.id) FILTER (WHERE wi.status = 'Done'))::numeric / count(wi.id)::numeric) * 100, 1)
  END AS completion_percent,
  count(DISTINCT wi.assignee_user_id) AS unique_assignees,
  count(DISTINCT wi.jira_project_id) AS project_count,
  min(wi.due_date) AS earliest_due,
  max(wi.due_date) AS latest_due
FROM ph_releases r
LEFT JOIN ph_work_items wi ON wi.release_id = r.id
GROUP BY r.id, r.name, r.title, r.description, r.status, r.color,
  r.start_date, r.target_date, r.actual_date, r.owner_user_id;

CREATE OR REPLACE VIEW vw_ph_resource_utilization AS
SELECT res.id, res.user_id, res.name, res.email, res.role,
  res.department, res.color, res.skills, res.capacity_hours_per_week, res.is_active,
  count(wi.id) AS total_items,
  count(wi.id) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')) AS active_items,
  count(wi.id) FILTER (WHERE wi.status = 'Done') AS completed_items,
  count(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress_items,
  count(wi.id) FILTER (WHERE wi.status = 'Blocked') AS blocked_items,
  COALESCE(sum(wi.estimated_hours) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')), 0) AS total_estimated_hours,
  COALESCE(sum(wi.actual_hours), 0) AS total_actual_hours,
  CASE WHEN res.capacity_hours_per_week = 0 THEN 0::numeric
    ELSE round((COALESCE(sum(wi.estimated_hours) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')), 0) / GREATEST(res.capacity_hours_per_week, 1)) * 100, 1)
  END AS utilization_percent,
  count(DISTINCT wi.release_id) AS release_count,
  count(DISTINCT wi.theme_id) AS theme_count,
  min(wi.due_date) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled') AND wi.due_date >= CURRENT_DATE) AS next_due_date
FROM ph_resources res
LEFT JOIN ph_work_items wi ON wi.assignee_user_id = res.user_id
WHERE res.is_active = true
GROUP BY res.id, res.user_id, res.name, res.email, res.role,
  res.department, res.color, res.skills, res.capacity_hours_per_week, res.is_active;

CREATE OR REPLACE VIEW vw_ph_theme_progress AS
SELECT t.id, t.name, t.description, t.color, t.owner_user_id,
  t.start_date, t.end_date, t.status, t.progress,
  count(wi.id) AS total_items,
  count(wi.id) FILTER (WHERE wi.status = 'Done') AS done_items,
  count(wi.id) FILTER (WHERE wi.item_type = 'Epic') AS epic_count,
  count(wi.id) FILTER (WHERE wi.item_type = 'Story') AS story_count,
  count(wi.id) FILTER (WHERE wi.item_type = 'Subtask') AS subtask_count,
  CASE WHEN count(wi.id) = 0 THEN 0::numeric
    ELSE round(((count(wi.id) FILTER (WHERE wi.status = 'Done'))::numeric / count(wi.id)::numeric) * 100, 1)
  END AS completion_percent
FROM ph_themes t
LEFT JOIN ph_work_items wi ON wi.theme_id = t.id
GROUP BY t.id, t.name, t.description, t.color, t.owner_user_id,
  t.start_date, t.end_date, t.status, t.progress;

CREATE OR REPLACE VIEW vw_ph_work_items_full AS
SELECT wi.id, wi.jira_issue_id, wi.item_key, wi.item_type, wi.summary,
  wi.description, wi.status, wi.priority, wi.parent_id, wi.hierarchy_path,
  wi.depth, wi.jira_project_id, wi.jira_status, wi.jira_priority,
  wi.jira_labels, wi.jira_sprint, wi.jira_story_points, wi.jira_url,
  wi.release_id, wi.theme_id, wi.assignee_user_id, wi.team_id,
  wi.due_date, wi.start_date, wi.completed_at, wi.last_synced_at,
  wi.sync_source, wi.is_jira_locked, wi.story_points, wi.estimated_hours,
  wi.actual_hours, wi.created_at, wi.updated_at,
  jp.project_key, jp.name AS project_name, jp.color AS project_color,
  r.name AS release_name, r.title AS release_title,
  r.status AS release_status, r.color AS release_color,
  t.name AS theme_name, t.color AS theme_color,
  res.name AS assignee_name, res.role AS assignee_role,
  res.department AS assignee_department, res.color AS assignee_color,
  parent_wi.item_key AS parent_key, parent_wi.summary AS parent_summary,
  (SELECT count(*) FROM ph_work_items c WHERE c.parent_id = wi.id) AS children_count,
  (SELECT count(*) FROM ph_comments cm WHERE cm.work_item_id = wi.id) AS comment_count
FROM ph_work_items wi
LEFT JOIN ph_jira_projects jp ON wi.jira_project_id = jp.id
LEFT JOIN ph_releases r ON wi.release_id = r.id
LEFT JOIN ph_themes t ON wi.theme_id = t.id
LEFT JOIN ph_resources res ON wi.assignee_user_id = res.user_id
LEFT JOIN ph_work_items parent_wi ON wi.parent_id = parent_wi.id;

-- 7. RECREATE TRIGGERS with ph_ names
CREATE TRIGGER ph_jira_connection_updated_trigger
  BEFORE UPDATE ON ph_jira_connection
  FOR EACH ROW EXECUTE FUNCTION ph_jira_connection_updated();

CREATE TRIGGER ph_config_updated_trigger
  BEFORE UPDATE ON ph_config
  FOR EACH ROW EXECUTE FUNCTION ph_config_updated();

CREATE TRIGGER ph_user_mapping_updated_trigger
  BEFORE UPDATE ON ph_user_mapping
  FOR EACH ROW EXECUTE FUNCTION ph_user_mapping_updated();

CREATE TRIGGER ph_themes_updated_trigger
  BEFORE UPDATE ON ph_themes
  FOR EACH ROW EXECUTE FUNCTION ph_themes_updated();

CREATE TRIGGER trg_ph_jira_projects_updated
  BEFORE UPDATE ON ph_jira_projects
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_timestamp();

CREATE TRIGGER trg_ph_releases_updated
  BEFORE UPDATE ON ph_releases
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_timestamp();

CREATE TRIGGER trg_ph_themes_updated
  BEFORE UPDATE ON ph_themes
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_timestamp();

CREATE TRIGGER trg_ph_work_items_updated
  BEFORE UPDATE ON ph_work_items
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_timestamp();

CREATE TRIGGER trg_ph_resources_updated
  BEFORE UPDATE ON ph_resources
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_timestamp();

CREATE TRIGGER trg_ph_update_theme_progress
  AFTER INSERT OR UPDATE OR DELETE ON ph_work_items
  FOR EACH ROW EXECUTE FUNCTION fn_ph_update_theme_progress();
