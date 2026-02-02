-- Drop and recreate the reorder function with a safe rank-swapping approach
-- Uses a temporary negative rank to avoid unique constraint violations

CREATE OR REPLACE FUNCTION public.aqd_reorder_item(
  p_item_id UUID,
  p_new_rank INTEGER,
  p_week_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_rank INTEGER;
  v_temp_rank INTEGER := -99999; -- Temporary rank to avoid constraint violations
BEGIN
  -- Get the current rank of the item
  SELECT rank INTO v_old_rank
  FROM aqd_items
  WHERE id = p_item_id AND week_id = p_week_id;
  
  IF v_old_rank IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  IF v_old_rank = p_new_rank THEN
    RETURN; -- No change needed
  END IF;
  
  -- PHASE 1: Move the dragged item to a temporary rank (negative, so it won't conflict)
  UPDATE aqd_items
  SET rank = v_temp_rank
  WHERE id = p_item_id;
  
  -- PHASE 2: Shift items in the affected range
  IF v_old_rank < p_new_rank THEN
    -- Moving down: shift items between old and new positions UP (decrease rank)
    UPDATE aqd_items
    SET rank = rank - 1
    WHERE week_id = p_week_id
      AND rank > v_old_rank
      AND rank <= p_new_rank
      AND id != p_item_id;
  ELSE
    -- Moving up: shift items between new and old positions DOWN (increase rank)
    UPDATE aqd_items
    SET rank = rank + 1
    WHERE week_id = p_week_id
      AND rank >= p_new_rank
      AND rank < v_old_rank
      AND id != p_item_id;
  END IF;
  
  -- PHASE 3: Set the moved item to its new rank
  UPDATE aqd_items
  SET rank = p_new_rank
  WHERE id = p_item_id;
END;
$$;