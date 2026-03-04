-- Forward-fix: Safely recreate t10 views with CASCADE to resolve dependency conflict
-- Drop dependent view first, then parent, then recreate both

DROP VIEW IF EXISTS t10_completed_summary_stats CASCADE;
DROP VIEW IF EXISTS t10_completed_weeks_summary CASCADE;

CREATE VIEW t10_completed_weeks_summary AS
SELECT 
  w.id AS week_id,
  w.list_id,
  w.week_start,
  w.week_end,
  w.status AS week_status,
  w.checkout_at,
  w.checkout_by,
  l.key AS list_key,
  l.name AS list_name,
  cp.full_name AS checkout_by_name,
  cp.avatar_url AS checkout_by_avatar,
  COALESCE(w.total_count, (
    SELECT COUNT(*) FROM t10_items WHERE week_id = w.id
  )) AS total_count,
  COALESCE(w.completed_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status IN ('done', 'completed')
  )) AS completed_count,
  COALESCE(w.carried_forward_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status = 'carried_forward'
  )) AS carried_forward_count,
  COALESCE(w.dropped_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status = 'dropped'
  )) AS dropped_count,
  CASE 
    WHEN COALESCE(w.total_count, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(w.completed_count, 0)::DECIMAL / 
       COALESCE(w.total_count, 1)) * 100, 
      1
    )
  END AS completion_rate,
  ROW_NUMBER() OVER (
    PARTITION BY w.list_id 
    ORDER BY w.week_start ASC
  ) AS week_number,
  COUNT(*) OVER (PARTITION BY w.list_id) AS total_weeks_in_list
FROM t10_weeks w
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN profiles cp ON w.checkout_by = cp.id
WHERE w.status = 'completed'
ORDER BY w.checkout_at DESC NULLS LAST, w.week_end DESC;

CREATE VIEW t10_completed_summary_stats AS
SELECT 
  COALESCE(COUNT(DISTINCT list_id), 0)::INTEGER AS total_lists_completed,
  COALESCE(COUNT(*), 0)::INTEGER AS total_weeks_completed,
  COALESCE(ROUND(AVG(
    CASE 
      WHEN total_count = 0 THEN 0
      ELSE (completed_count::DECIMAL / total_count) * 100
    END
  ), 1), 0)::NUMERIC AS avg_completion_rate,
  COALESCE(SUM(completed_count), 0)::INTEGER AS total_items_completed,
  COALESCE(SUM(carried_forward_count), 0)::INTEGER AS total_carried_forward,
  COALESCE(SUM(dropped_count), 0)::INTEGER AS total_dropped
FROM t10_completed_weeks_summary;