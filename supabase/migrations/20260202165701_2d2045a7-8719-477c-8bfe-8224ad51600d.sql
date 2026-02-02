
-- Drop and recreate the reorder function with proper 3-phase atomic update
CREATE OR REPLACE FUNCTION public.aqd_reorder_item(
  p_item_id UUID,
  p_new_rank INTEGER,
  p_week_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_rank INTEGER;
  v_current_user_id UUID;
BEGIN
  -- Acquire advisory lock to prevent race conditions (based on week_id)
  PERFORM pg_advisory_xact_lock(hashtext(p_week_id::text));
  
  -- Get the current rank before updating
  SELECT rank INTO v_old_rank FROM aqd_items WHERE id = p_item_id;
  
  -- If same rank, nothing to do
  IF v_old_rank = p_new_rank THEN
    RETURN;
  END IF;
  
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- PHASE 1: Move the item to temporary rank 0 to avoid constraint violation
  UPDATE aqd_items
  SET rank = 0, updated_at = NOW()
  WHERE id = p_item_id;
  
  -- PHASE 2: Shift other items
  IF p_new_rank < v_old_rank THEN
    -- Moving up: shift items in range [new_rank, old_rank-1] down by 1
    UPDATE aqd_items
    SET rank = rank + 1
    WHERE week_id = p_week_id
      AND rank >= p_new_rank
      AND rank < v_old_rank
      AND id != p_item_id;
  ELSE
    -- Moving down: shift items in range [old_rank+1, new_rank] up by 1
    UPDATE aqd_items
    SET rank = rank - 1
    WHERE week_id = p_week_id
      AND rank > v_old_rank
      AND rank <= p_new_rank
      AND id != p_item_id;
  END IF;
  
  -- PHASE 3: Place the item at its final rank and store previous rank
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
$$;
