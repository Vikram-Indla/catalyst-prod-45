-- Create a function to reorder aqd_items atomically
-- This function handles the rank shuffling within a single transaction
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
  
  -- Temporarily set the moving item to rank 0 (we'll allow this temporarily)
  -- Actually, since we have a check constraint, we need to update in the right order
  
  IF v_old_rank < p_new_rank THEN
    -- Moving down: shift items between old and new positions UP (decrease rank)
    -- Update from highest rank to lowest to avoid conflicts
    UPDATE aqd_items
    SET rank = rank - 1
    WHERE week_id = p_week_id
      AND rank > v_old_rank
      AND rank <= p_new_rank
      AND id != p_item_id;
  ELSE
    -- Moving up: shift items between new and old positions DOWN (increase rank)
    -- Update from lowest rank to highest to avoid conflicts
    UPDATE aqd_items
    SET rank = rank + 1
    WHERE week_id = p_week_id
      AND rank >= p_new_rank
      AND rank < v_old_rank
      AND id != p_item_id;
  END IF;
  
  -- Finally set the moved item to its new rank
  UPDATE aqd_items
  SET rank = p_new_rank
  WHERE id = p_item_id;
END;
$$;