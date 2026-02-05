-- Fix SECURITY DEFINER views by recreating as SECURITY INVOKER

-- ============================================================
-- VIEW 1: pri_items_full (SECURITY INVOKER)
-- ============================================================
DROP VIEW IF EXISTS pri_items_full;
CREATE VIEW pri_items_full
WITH (security_invoker = true)
AS
SELECT
  i.*,
  p.full_name   AS assignee_name,
  p.avatar_url  AS assignee_avatar,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'color', l.color
    ) ORDER BY l.name)
    FROM pri_item_labels il
    JOIN pri_labels l ON l.id = il.label_id
    WHERE il.item_id = i.id),
    '[]'::jsonb
  ) AS labels,
  (SELECT COUNT(*) FROM pri_item_notes n WHERE n.item_id = i.id)::int AS note_count
FROM pri_items i
LEFT JOIN profiles p ON p.id = i.assignee_id;


-- ============================================================
-- VIEW 2: pri_lists_full (SECURITY INVOKER)
-- ============================================================
DROP VIEW IF EXISTS pri_lists_full;
CREATE VIEW pri_lists_full
WITH (security_invoker = true)
AS
SELECT
  l.*,
  p.full_name   AS owner_name,
  p.avatar_url  AS owner_avatar,
  (SELECT w.id FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_id,
  (SELECT w.week_start FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_start,
  (SELECT w.week_end FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_end,
  (SELECT COUNT(*) FROM pri_weeks w WHERE w.list_id = l.id)::int AS total_weeks,
  (SELECT COUNT(*) FROM pri_items i
   JOIN pri_weeks w ON w.id = i.week_id
   WHERE w.list_id = l.id AND w.status = 'active'
  )::int AS active_item_count,
  (SELECT COUNT(*) FROM pri_items i
   JOIN pri_weeks w ON w.id = i.week_id
   WHERE w.list_id = l.id AND w.status = 'active' AND i.status = 'completed'
  )::int AS completed_item_count
FROM pri_lists l
LEFT JOIN profiles p ON p.id = l.owner_id;


-- ============================================================
-- VIEW 3: pri_weeks_full (SECURITY INVOKER)
-- ============================================================
DROP VIEW IF EXISTS pri_weeks_full;
CREATE VIEW pri_weeks_full
WITH (security_invoker = true)
AS
SELECT
  w.*,
  p.full_name   AS checked_out_by_name,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id)::int AS total_items,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'todo')::int AS todo_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'in_progress')::int AS in_progress_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'completed')::int AS completed_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.is_carryover = true)::int AS carryover_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.rank <= 10)::int AS top_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.rank > 10)::int AS overflow_count
FROM pri_weeks w
LEFT JOIN profiles p ON p.id = w.checked_out_by;