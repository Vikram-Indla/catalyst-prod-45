-- Drop and recreate aqd_lists_summary view with created_by_name
DROP VIEW IF EXISTS aqd_lists_summary CASCADE;

CREATE VIEW aqd_lists_summary AS
SELECT 
  l.id,
  l.name,
  l.description,
  l.created_by,
  p.full_name AS created_by_name,
  l.created_at,
  l.updated_at,
  l.is_archived,
  l.is_pinned,
  l.settings,
  COALESCE(item_stats.total_items, 0) AS total_items,
  COALESCE(item_stats.done_items, 0) AS done_items,
  COALESCE(item_stats.pending_items, 0) AS pending_items,
  COALESCE(item_stats.overdue_items, 0) AS overdue_items,
  current_week.id AS current_week_id,
  current_week.week_number AS current_week_number,
  current_week.status AS current_week_status,
  current_week.start_date AS current_week_start,
  current_week.end_date AS current_week_end
FROM aqd_lists l
LEFT JOIN profiles p ON p.id = l.created_by
LEFT JOIN LATERAL (
  SELECT 
    w.id,
    w.week_number,
    w.status,
    w.start_date,
    w.end_date
  FROM aqd_weeks w
  WHERE w.list_id = l.id
  ORDER BY w.year DESC, w.week_number DESC
  LIMIT 1
) current_week ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) AS total_items,
    COUNT(*) FILTER (WHERE i.status = 'completed') AS done_items,
    COUNT(*) FILTER (WHERE i.status != 'completed') AS pending_items,
    COUNT(*) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status != 'completed') AS overdue_items
  FROM aqd_items i
  WHERE i.week_id = current_week.id
) item_stats ON true;