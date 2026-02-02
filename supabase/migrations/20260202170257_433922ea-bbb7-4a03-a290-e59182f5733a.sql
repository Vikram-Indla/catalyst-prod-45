
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
  v_temp_rank INTEGER;
  r INTEGER;
BEGIN
  -- Prevent race conditions within a week
  PERFORM pg_advisory_xact_lock(hashtext(p_week_id::text));

  -- Fetch current rank
  SELECT rank INTO v_old_rank
  FROM public.aqd_items
  WHERE id = p_item_id;

  IF v_old_rank IS NULL THEN
    RAISE EXCEPTION 'Item not found for reorder: %', p_item_id;
  END IF;

  -- No-op
  IF v_old_rank = p_new_rank THEN
    RETURN;
  END IF;

  -- Ensure we have a free temporary rank within allowed check range [0..20]
  SELECT gs INTO v_temp_rank
  FROM generate_series(0, 20) AS gs
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.aqd_items i
    WHERE i.week_id = p_week_id
      AND i.rank = gs
      AND i.id <> p_item_id
  )
  LIMIT 1;

  IF v_temp_rank IS NULL THEN
    RAISE EXCEPTION 'No temporary rank slot available (0..20) for week %', p_week_id;
  END IF;

  -- Get current user for activity
  v_current_user_id := auth.uid();

  -- PHASE 1: move the item out of the way into the free temp rank
  UPDATE public.aqd_items
  SET rank = v_temp_rank,
      updated_at = NOW()
  WHERE id = p_item_id;

  -- PHASE 2: shift other items one-by-one to avoid unique collisions
  IF p_new_rank < v_old_rank THEN
    -- Moving up (toward smaller number): other items shift down (+1)
    FOR r IN REVERSE (v_old_rank - 1)..p_new_rank LOOP
      UPDATE public.aqd_items
      SET rank = r + 1,
          updated_at = NOW()
      WHERE week_id = p_week_id
        AND rank = r
        AND id <> p_item_id;
    END LOOP;
  ELSE
    -- Moving down (toward larger number): other items shift up (-1)
    FOR r IN (v_old_rank + 1)..p_new_rank LOOP
      UPDATE public.aqd_items
      SET rank = r - 1,
          updated_at = NOW()
      WHERE week_id = p_week_id
        AND rank = r
        AND id <> p_item_id;
    END LOOP;
  END IF;

  -- PHASE 3: place item at final rank + update rank-change tracking
  UPDATE public.aqd_items
  SET rank = p_new_rank,
      previous_rank = v_old_rank,
      rank_changed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_item_id;

  INSERT INTO public.aqd_activity (item_id, action, field_name, old_value, new_value, created_by)
  VALUES (p_item_id, 'rank_changed', 'rank', v_old_rank::text, p_new_rank::text, v_current_user_id);
END;
$$;
