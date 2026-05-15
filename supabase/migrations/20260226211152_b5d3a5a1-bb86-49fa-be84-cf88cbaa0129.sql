
-- Must drop and recreate to add new column
DROP VIEW IF EXISTS v_project_list;

CREATE VIEW v_project_list AS
SELECT p.id,
    p.key AS project_key,
    p.name,
    p.department,
    p.description,
    COALESCE(p.display_status, p.status::text) AS status,
    p.health_status,
    p.status_category,
    COALESCE(wic.epic_count, p.total_epics) AS total_epics,
    COALESCE(wic.feature_count, 0) AS total_features,
    COALESCE(wic.story_count, p.total_stories) AS total_stories,
    COALESCE(wic.task_count, p.total_tasks) AS total_tasks,
    COALESCE(wic.todo_count, p.work_items_todo) AS work_items_todo,
    COALESCE(wic.in_progress_count, p.work_items_in_progress) AS work_items_in_progress,
    COALESCE(wic.done_count, p.work_items_done) AS work_items_done,
    CASE
        WHEN COALESCE(wic.total_count, 0) > 0 THEN COALESCE(wic.done_count, 0) * 100 / wic.total_count
        ELSE p.completion_percentage
    END AS completion_percentage,
    COALESCE(wic.total_count, p.total_epics + p.total_stories + p.total_tasks) AS total_issues,
    p.updated_at,
    p.created_at,
    p.owner_id,
    p.priority,
    p.tags,
    COALESCE(mc.member_count, 0) AS member_count,
    mc.member_ids
FROM projects p
LEFT JOIN LATERAL (
    SELECT count(*)::integer AS member_count,
           array_agg(pm.user_id) AS member_ids
    FROM project_members pm
    WHERE pm.project_id = p.id
) mc ON true
LEFT JOIN ph_projects php ON php.key::text = p.key AND php.is_archived = false
LEFT JOIN LATERAL (
    SELECT count(*)::integer AS total_count,
           count(*) FILTER (WHERE wi.item_type = 'Epic')::integer AS epic_count,
           count(*) FILTER (WHERE wi.item_type = 'Feature')::integer AS feature_count,
           count(*) FILTER (WHERE wi.item_type = 'Story')::integer AS story_count,
           count(*) FILTER (WHERE wi.item_type = ANY (ARRAY['Task', 'Bug', 'Subtask']))::integer AS task_count,
           count(*) FILTER (WHERE wi.status = 'to_do')::integer AS todo_count,
           count(*) FILTER (WHERE wi.status = 'in_progress')::integer AS in_progress_count,
           count(*) FILTER (WHERE wi.status = 'in_production')::integer AS done_count
    FROM ph_work_items wi
    WHERE wi.project_id = php.id
) wic ON php.id IS NOT NULL
WHERE p.status::text = 'active'

UNION ALL

SELECT ph.id,
    ph.key AS project_key,
    ph.name,
    ph.department,
    ph.description,
    COALESCE(ph.status, 'active'::character varying) AS status,
    ph.health AS health_status,
    NULL::text AS status_category,
    COALESCE(wic2.epic_count, 0) AS total_epics,
    COALESCE(wic2.feature_count, 0) AS total_features,
    COALESCE(wic2.story_count, 0) AS total_stories,
    COALESCE(wic2.task_count, 0) AS total_tasks,
    COALESCE(wic2.todo_count, 0) AS work_items_todo,
    COALESCE(wic2.in_progress_count, 0) AS work_items_in_progress,
    COALESCE(wic2.done_count, 0) AS work_items_done,
    CASE
        WHEN COALESCE(wic2.total_count, 0) > 0 THEN COALESCE(wic2.done_count, 0) * 100 / wic2.total_count
        ELSE 0
    END AS completion_percentage,
    COALESCE(wic2.total_count, 0) AS total_issues,
    ph.updated_at,
    ph.created_at,
    ph.created_by AS owner_id,
    NULL::text AS priority,
    NULL::text[] AS tags,
    COALESCE(phmc.member_count, 0) AS member_count,
    phmc.member_ids
FROM ph_projects ph
LEFT JOIN LATERAL (
    SELECT count(*)::integer AS member_count,
           array_agg(pm.user_id) AS member_ids
    FROM ph_project_members pm
    WHERE pm.project_id = ph.id
) phmc ON true
LEFT JOIN LATERAL (
    SELECT count(*)::integer AS total_count,
           count(*) FILTER (WHERE wi.item_type = 'Epic')::integer AS epic_count,
           count(*) FILTER (WHERE wi.item_type = 'Feature')::integer AS feature_count,
           count(*) FILTER (WHERE wi.item_type = 'Story')::integer AS story_count,
           count(*) FILTER (WHERE wi.item_type = ANY (ARRAY['Task', 'Bug', 'Subtask']))::integer AS task_count,
           count(*) FILTER (WHERE wi.status = 'to_do')::integer AS todo_count,
           count(*) FILTER (WHERE wi.status = 'in_progress')::integer AS in_progress_count,
           count(*) FILTER (WHERE wi.status = 'in_production')::integer AS done_count
    FROM ph_work_items wi
    WHERE wi.project_id = ph.id
) wic2 ON true
WHERE ph.is_archived = false
  AND NOT EXISTS (
    SELECT 1 FROM projects p2
    WHERE p2.key = ph.key::text
  )
ORDER BY total_issues DESC;
