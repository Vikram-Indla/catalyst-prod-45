-- Serialize reorders per week to avoid concurrent temp-rank collisions
CREATE OR REPLACE FUNCTION public.aqd_reorder_item(p_item_id uuid, p_new_rank integer, p_week_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_rank INTEGER;
  v_temp_rank INTEGER := 0; -- Must satisfy aqd_items_rank_check
BEGIN
  -- Ensure only one reorder runs at a time per week (prevents UNIQUE (week_id, rank) collisions on temp rank)
  PERFORM pg_advisory_xact_lock(hashtext(p_week_id::text));

  -- Get the current rank of the item
  SELECT rank INTO v_old_rank
  FROM public.aqd_items
  WHERE id = p_item_id AND week_id = p_week_id;

  IF v_old_rank IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_old_rank = p_new_rank THEN
    RETURN; -- No change needed
  END IF;

  -- Guardrails: keep within allowed range
  IF p_new_rank < 1 OR p_new_rank > 20 THEN
    RAISE EXCEPTION 'Invalid new rank % (must be 1..20)', p_new_rank;
  END IF;

  -- PHASE 1: Move the dragged item to temp rank 0 to avoid unique conflicts
  UPDATE public.aqd_items
  SET rank = v_temp_rank
  WHERE id = p_item_id AND week_id = p_week_id;

  -- PHASE 2: Shift items in the affected range (within same week)
  IF v_old_rank < p_new_rank THEN
    -- Moving down: shift items between old and new positions UP (decrease rank)
    UPDATE public.aqd_items
    SET rank = rank - 1
    WHERE week_id = p_week_id
      AND rank > v_old_rank
      AND rank <= p_new_rank
      AND id <> p_item_id;
  ELSE
    -- Moving up: shift items between new and old positions DOWN (increase rank)
    UPDATE public.aqd_items
    SET rank = rank + 1
    WHERE week_id = p_week_id
      AND rank >= p_new_rank
      AND rank < v_old_rank
      AND id <> p_item_id;
  END IF;

  -- PHASE 3: Set the moved item to its new rank
  UPDATE public.aqd_items
  SET rank = p_new_rank
  WHERE id = p_item_id AND week_id = p_week_id;
END;
$function$;