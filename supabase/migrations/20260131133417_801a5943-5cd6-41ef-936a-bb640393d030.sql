-- Update planner_board_columns view to include is_system field
DROP VIEW IF EXISTS planner_board_columns;

CREATE OR REPLACE VIEW planner_board_columns AS
SELECT 
  ps.id,
  ps.name,
  ps.slug,
  ps.color,
  ps.sort_order,
  ps.position,
  ps.is_default,
  ps.is_done,
  ps.is_completed_status,
  ps.is_system,
  ps.created_at,
  ps.updated_at,
  (
    SELECT COUNT(*)::integer 
    FROM planner_tasks pt 
    WHERE pt.status_id = ps.id 
    AND pt.deleted_at IS NULL
  ) AS task_count
FROM planner_statuses ps
ORDER BY ps.position;