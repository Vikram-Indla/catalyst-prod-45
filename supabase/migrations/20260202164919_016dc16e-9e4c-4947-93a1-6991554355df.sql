-- Add columns to track rank changes for the Rank Change Indicator feature
ALTER TABLE aqd_items ADD COLUMN IF NOT EXISTS previous_rank INTEGER;
ALTER TABLE aqd_items ADD COLUMN IF NOT EXISTS rank_changed_at TIMESTAMPTZ;

-- Update the aqd_items_full view to include the new columns
DROP VIEW IF EXISTS aqd_items_full;
CREATE OR REPLACE VIEW aqd_items_full AS
SELECT 
  i.*,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  cp.full_name AS created_by_name,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', l.id,
        'list_id', l.list_id,
        'name', l.name,
        'color', l.color,
        'sort_order', l.sort_order,
        'created_at', l.created_at
      ) ORDER BY l.sort_order
    )
    FROM aqd_item_labels il
    JOIN aqd_labels l ON l.id = il.label_id
    WHERE il.item_id = i.id),
    '[]'::json
  ) AS labels,
  COALESCE(
    (SELECT COUNT(*) FROM aqd_item_notes n WHERE n.item_id = i.id AND n.is_deleted = false),
    0
  ) AS note_count
FROM aqd_items i
LEFT JOIN profiles p ON p.id = i.assignee_id
LEFT JOIN profiles cp ON cp.id = i.created_by;

-- Update the aqd_reorder_item function to track previous rank
CREATE OR REPLACE FUNCTION aqd_reorder_item(
  p_item_id UUID,
  p_new_rank INTEGER,
  p_week_id UUID
) RETURNS void AS $$
DECLARE
  v_old_rank INTEGER;
  v_current_user_id UUID;
BEGIN
  -- Get the current rank before updating
  SELECT rank INTO v_old_rank FROM aqd_items WHERE id = p_item_id;
  
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- If moving to a higher rank (lower number), shift items down
  IF p_new_rank < v_old_rank THEN
    UPDATE aqd_items
    SET rank = rank + 1
    WHERE week_id = p_week_id
      AND rank >= p_new_rank
      AND rank < v_old_rank
      AND id != p_item_id;
  -- If moving to a lower rank (higher number), shift items up
  ELSIF p_new_rank > v_old_rank THEN
    UPDATE aqd_items
    SET rank = rank - 1
    WHERE week_id = p_week_id
      AND rank > v_old_rank
      AND rank <= p_new_rank
      AND id != p_item_id;
  END IF;
  
  -- Update the item's rank and store previous rank for change indicator
  UPDATE aqd_items
  SET 
    rank = p_new_rank,
    previous_rank = v_old_rank,
    rank_changed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Log activity for rank change
  INSERT INTO aqd_activity (item_id, action, field_name, old_value, new_value, created_by)
  VALUES (p_item_id, 'rank_changed', 'rank', v_old_rank::text, p_new_rank::text, v_current_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;