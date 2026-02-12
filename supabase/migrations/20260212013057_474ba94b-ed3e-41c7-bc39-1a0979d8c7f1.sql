
-- Calendar Events View: UNION of releases, themes, and work items
CREATE OR REPLACE VIEW public.vw_wh_calendar_events AS

-- Release events
SELECT
  r.id::text AS entity_id,
  'release'::text AS event_type,
  COALESCE(r.name || ' — ' || r.title, r.name) AS event_title,
  r.target_date::text AS event_date,
  r.start_date::text AS event_start,
  r.target_date::text AS event_end,
  r.status AS event_status,
  NULL::uuid AS assignee_user_id,
  NULL::text AS assignee_name,
  COALESCE(r.color, '#2563eb') AS event_color
FROM public.ph_releases r
WHERE r.target_date IS NOT NULL

UNION ALL

-- Theme events
SELECT
  t.id::text AS entity_id,
  'theme'::text AS event_type,
  t.name AS event_title,
  t.target_date::text AS event_date,
  t.start_date::text AS event_start,
  t.end_date::text AS event_end,
  t.status AS event_status,
  NULL::uuid AS assignee_user_id,
  NULL::text AS assignee_name,
  COALESCE(t.color, '#7c3aed') AS event_color
FROM public.ph_themes t
WHERE t.start_date IS NOT NULL OR t.end_date IS NOT NULL

UNION ALL

-- Work item events
SELECT
  w.id::text AS entity_id,
  'workitem'::text AS event_type,
  COALESCE(w.item_key || ' — ' || w.summary, w.summary) AS event_title,
  w.due_date::text AS event_date,
  w.start_date::text AS event_start,
  w.due_date::text AS event_end,
  w.status AS event_status,
  w.assignee_user_id,
  p.full_name AS assignee_name,
  CASE w.item_type
    WHEN 'Epic' THEN '#1e40af'
    WHEN 'Story' THEN '#065f46'
    WHEN 'Bug' THEN '#991b1b'
    WHEN 'Task' THEN '#475569'
    WHEN 'Subtask' THEN '#3730a3'
    ELSE '#2563eb'
  END AS event_color
FROM public.ph_work_items w
LEFT JOIN public.profiles p ON p.id = w.assignee_user_id
WHERE w.due_date IS NOT NULL;
