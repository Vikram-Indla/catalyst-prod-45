-- Drop and recreate the t10_list_cards view to include all past weeks (not just completed)
DROP VIEW IF EXISTS t10_list_cards;

CREATE VIEW t10_list_cards 
WITH (security_invoker = on) AS
SELECT 
  l.id,
  l.key,
  l.name,
  l.description,
  l.status,
  l.created_at,
  l.updated_at,
  l.created_by,
  l.archived_at,
  l.archived_by,
  p.full_name AS creator_name,
  p.avatar_url AS creator_avatar,
  cw.id AS current_week_id,
  cw.week_start,
  cw.week_end,
  COALESCE(cw.total_count, 0) AS total_count,
  COALESCE(cw.completed_count, 0) AS completed_count,
  GREATEST(0, 10 - COALESCE(cw.total_count, 0)) AS slots_available,
  CASE 
    WHEN COALESCE(cw.total_count, 0) > 0 
    THEN ROUND(cw.completed_count::numeric / cw.total_count::numeric * 100)
    ELSE 0
  END AS completion_percent,
  -- Count all non-current weeks (not just completed)
  (SELECT COUNT(*) FROM t10_weeks WHERE list_id = l.id AND is_current = false) AS past_weeks_count,
  -- Include all non-current weeks in past_weeks JSON (not just completed)
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', pw.id,
        'week_start', pw.week_start,
        'week_end', pw.week_end,
        'completed_count', pw.completed_count,
        'total_count', pw.total_count,
        'is_complete', pw.completed_count = pw.total_count AND pw.total_count > 0,
        'status', pw.status
      ) ORDER BY pw.week_start DESC
    )
    FROM (
      SELECT id, week_start, week_end, completed_count, total_count, status
      FROM t10_weeks
      WHERE list_id = l.id AND is_current = false
      ORDER BY week_start DESC
      LIMIT 10
    ) pw
    ),
    '[]'::json
  ) AS past_weeks
FROM t10_lists l
LEFT JOIN profiles p ON l.created_by = p.id
LEFT JOIN t10_weeks cw ON cw.list_id = l.id AND cw.is_current = true
ORDER BY 
  CASE WHEN l.status = 'archived' THEN 1 ELSE 0 END,
  l.updated_at DESC;