
ALTER TABLE public.ph_projects ADD COLUMN IF NOT EXISTS priority text;

CREATE OR REPLACE VIEW public.v_project_list AS
 SELECT p.id,
    p.key AS project_key,
    p.name,
    p.department,
    p.description,
    COALESCE(p.display_status, p.status::text) AS status,
    p.health_status,
    p.status_category,
    COALESCE(pic.epic_count, p.total_epics) AS total_epics,
    COALESCE(pic.feature_count, 0) AS total_features,
    COALESCE(pic.story_count, p.total_stories) AS total_stories,
    COALESCE(pic.task_count, p.total_tasks) AS total_tasks,
    COALESCE(pic.todo_count, p.work_items_todo) AS work_items_todo,
    COALESCE(pic.in_progress_count, p.work_items_in_progress) AS work_items_in_progress,
    COALESCE(pic.done_count, p.work_items_done) AS work_items_done,
        CASE
            WHEN COALESCE(pic.total_count, 0) > 0 THEN COALESCE(pic.done_count, 0) * 100 / pic.total_count
            ELSE p.completion_percentage
        END AS completion_percentage,
    COALESCE(pic.total_count, p.total_epics + p.total_stories + p.total_tasks) AS total_issues,
    p.updated_at,
    p.created_at,
    p.owner_id,
    p.priority,
    p.tags,
    COALESCE(mc.member_count, 0) AS member_count,
    mc.member_ids,
    php.updated_at AS last_synced_at,
    p.lead_id,
    lp.full_name AS lead_name,
    lp.avatar_url AS lead_avatar_url
   FROM projects p
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS member_count,
            array_agg(pm.user_id) AS member_ids
           FROM project_members pm
          WHERE pm.project_id = p.id) mc ON true
     LEFT JOIN ph_projects php ON php.key::text = p.key AND php.is_archived = false
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS total_count,
            count(*) FILTER (WHERE i.issue_type = 'Epic'::text)::integer AS epic_count,
            count(*) FILTER (WHERE i.issue_type = 'Feature'::text)::integer AS feature_count,
            count(*) FILTER (WHERE i.issue_type = 'Story'::text)::integer AS story_count,
            count(*) FILTER (WHERE i.issue_type = ANY (ARRAY['Task'::text, 'Sub-task'::text, 'Bug'::text]))::integer AS task_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['to_do'::text, 'To Do'::text, 'backlog'::text, 'Backlog'::text, 'open'::text, 'Open'::text]))::integer AS todo_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['in_progress'::text, 'In Progress'::text, 'in_review'::text, 'In Review'::text]))::integer AS in_progress_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['done'::text, 'Done'::text, 'closed'::text, 'Closed'::text, 'resolved'::text, 'Resolved'::text]))::integer AS done_count
           FROM ph_issues i
          WHERE i.project_key = p.key) pic ON true
     LEFT JOIN profiles lp ON lp.id = p.lead_id
  WHERE p.status = 'active'::program_status
UNION ALL
 SELECT ph.id,
    ph.key AS project_key,
    ph.name,
    ph.department,
    ph.description,
    COALESCE(ph.status, 'active'::character varying) AS status,
    ph.health AS health_status,
    NULL::text AS status_category,
    COALESCE(pic2.epic_count, 0) AS total_epics,
    COALESCE(pic2.feature_count, 0) AS total_features,
    COALESCE(pic2.story_count, 0) AS total_stories,
    COALESCE(pic2.task_count, 0) AS total_tasks,
    COALESCE(pic2.todo_count, 0) AS work_items_todo,
    COALESCE(pic2.in_progress_count, 0) AS work_items_in_progress,
    COALESCE(pic2.done_count, 0) AS work_items_done,
        CASE
            WHEN COALESCE(pic2.total_count, 0) > 0 THEN COALESCE(pic2.done_count, 0) * 100 / pic2.total_count
            ELSE 0
        END AS completion_percentage,
    COALESCE(pic2.total_count, 0) AS total_issues,
    ph.updated_at,
    ph.created_at,
    ph.created_by AS owner_id,
    ph.priority,
    NULL::text[] AS tags,
    COALESCE(phmc.member_count, 0) AS member_count,
    phmc.member_ids,
    ph.updated_at AS last_synced_at,
    NULL::uuid AS lead_id,
    NULL::text AS lead_name,
    NULL::text AS lead_avatar_url
   FROM ph_projects ph
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS member_count,
            array_agg(pm.user_id) AS member_ids
           FROM ph_project_members pm
          WHERE pm.project_id = ph.id) phmc ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS total_count,
            count(*) FILTER (WHERE i.issue_type = 'Epic'::text)::integer AS epic_count,
            count(*) FILTER (WHERE i.issue_type = 'Feature'::text)::integer AS feature_count,
            count(*) FILTER (WHERE i.issue_type = 'Story'::text)::integer AS story_count,
            count(*) FILTER (WHERE i.issue_type = ANY (ARRAY['Task'::text, 'Sub-task'::text, 'Bug'::text]))::integer AS task_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['to_do'::text, 'To Do'::text, 'backlog'::text, 'Backlog'::text, 'open'::text, 'Open'::text]))::integer AS todo_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['in_progress'::text, 'In Progress'::text, 'in_review'::text, 'In Review'::text]))::integer AS in_progress_count,
            count(*) FILTER (WHERE i.status = ANY (ARRAY['done'::text, 'Done'::text, 'closed'::text, 'Closed'::text, 'resolved'::text, 'Resolved'::text]))::integer AS done_count
           FROM ph_issues i
          WHERE i.project_key = ph.key) pic2 ON true
  WHERE ph.is_archived = false
    AND NOT EXISTS (SELECT 1 FROM projects p2 WHERE p2.key = ph.key AND p2.status = 'active'::program_status);
