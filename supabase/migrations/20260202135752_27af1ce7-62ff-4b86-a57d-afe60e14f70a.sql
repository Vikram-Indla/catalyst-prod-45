-- Fix drag/drop reorder failures caused by aqd_items_rank_check (1..20)
-- Allow a temporary rank of 0, and update reorder RPC to use it safely.

BEGIN;

-- 1) Update rank check constraint to allow 0 as a temporary value
ALTER TABLE public.aqd_items
  DROP CONSTRAINT IF EXISTS aqd_items_rank_check;

ALTER TABLE public.aqd_items
  ADD CONSTRAINT aqd_items_rank_check
  CHECK ((rank >= 0) AND (rank <= 20));

-- 2) Recreate reorder function using temp rank 0 (within constraint range)
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
  v_temp_rank INTEGER := 0; -- Must satisfy aqd_items_rank_check
BEGIN
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
$$;

COMMIT;