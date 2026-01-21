-- ============================================================
-- MODULE 3B-2: QUEUE MANAGEMENT
-- Database Functions
-- ============================================================

-- ============================================================
-- Function 1: reorder_queue_item
-- Moves a queue item to a specific position
-- ============================================================
CREATE OR REPLACE FUNCTION reorder_queue_item(
  p_queue_item_id UUID,
  p_new_position INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_run_id UUID;
  v_old_position INTEGER;
  v_max_position INTEGER;
BEGIN
  -- Get current item
  SELECT * INTO v_item
  FROM execution_queue
  WHERE id = p_queue_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Queue item not found');
  END IF;

  v_run_id := v_item.run_id;
  v_old_position := v_item.position;

  -- Get max position
  SELECT MAX(position) INTO v_max_position
  FROM execution_queue
  WHERE run_id = v_run_id AND status = 'queued';

  -- Clamp new position
  p_new_position := GREATEST(1, LEAST(p_new_position, COALESCE(v_max_position, 1)));

  IF v_old_position = p_new_position THEN
    RETURN jsonb_build_object('success', true, 'message', 'Position unchanged');
  END IF;

  -- Shift other items
  IF p_new_position < v_old_position THEN
    -- Moving up: shift items down
    UPDATE execution_queue SET
      position = position + 1
    WHERE run_id = v_run_id
      AND position >= p_new_position
      AND position < v_old_position
      AND id != p_queue_item_id;
  ELSE
    -- Moving down: shift items up
    UPDATE execution_queue SET
      position = position - 1
    WHERE run_id = v_run_id
      AND position > v_old_position
      AND position <= p_new_position
      AND id != p_queue_item_id;
  END IF;

  -- Update item position
  UPDATE execution_queue SET
    position = p_new_position
  WHERE id = p_queue_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'old_position', v_old_position,
    'new_position', p_new_position
  );
END;
$$;


-- ============================================================
-- Function 2: move_items_to_top
-- Moves one or more items to the front of the queue
-- ============================================================
CREATE OR REPLACE FUNCTION move_items_to_top(
  p_run_id UUID,
  p_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_count INTEGER;
BEGIN
  v_item_count := array_length(p_item_ids, 1);
  IF v_item_count IS NULL OR v_item_count = 0 THEN
    RETURN jsonb_build_object('error', 'No items specified');
  END IF;

  -- Shift all other items down by the count of moved items
  UPDATE execution_queue SET
    position = position + v_item_count
  WHERE run_id = p_run_id
    AND status = 'queued'
    AND id != ALL(p_item_ids);

  -- Assign new positions to moved items (maintaining their relative order)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
    FROM execution_queue
    WHERE id = ANY(p_item_ids)
  )
  UPDATE execution_queue eq SET
    position = r.new_pos
  FROM ranked r
  WHERE eq.id = r.id;

  RETURN jsonb_build_object('success', true, 'moved_count', v_item_count);
END;
$$;


-- ============================================================
-- Function 3: move_items_to_bottom
-- Moves one or more items to the end of the queue
-- ============================================================
CREATE OR REPLACE FUNCTION move_items_to_bottom(
  p_run_id UUID,
  p_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_count INTEGER;
  v_max_position INTEGER;
BEGIN
  v_item_count := array_length(p_item_ids, 1);
  IF v_item_count IS NULL OR v_item_count = 0 THEN
    RETURN jsonb_build_object('error', 'No items specified');
  END IF;

  -- Get current max position (excluding moved items)
  SELECT COALESCE(MAX(position), 0) INTO v_max_position
  FROM execution_queue
  WHERE run_id = p_run_id
    AND status = 'queued'
    AND id != ALL(p_item_ids);

  -- Compact remaining items
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
    FROM execution_queue
    WHERE run_id = p_run_id
      AND status = 'queued'
      AND id != ALL(p_item_ids)
  )
  UPDATE execution_queue eq SET
    position = r.new_pos
  FROM ranked r
  WHERE eq.id = r.id;

  -- Get new max after compaction
  SELECT COALESCE(MAX(position), 0) INTO v_max_position
  FROM execution_queue
  WHERE run_id = p_run_id
    AND status = 'queued'
    AND id != ALL(p_item_ids);

  -- Assign new positions to moved items at the end
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as idx
    FROM execution_queue
    WHERE id = ANY(p_item_ids)
  )
  UPDATE execution_queue eq SET
    position = v_max_position + r.idx
  FROM ranked r
  WHERE eq.id = r.id;

  RETURN jsonb_build_object('success', true, 'moved_count', v_item_count);
END;
$$;


-- ============================================================
-- Function 4: bulk_change_priority
-- Changes priority for multiple queue items
-- ============================================================
CREATE OR REPLACE FUNCTION bulk_change_priority(
  p_run_id UUID,
  p_item_ids UUID[],
  p_new_priority TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority_value INTEGER;
  v_updated_count INTEGER;
BEGIN
  -- Validate priority
  v_priority_value := CASE p_new_priority
    WHEN 'critical' THEN 100
    WHEN 'high' THEN 75
    WHEN 'medium' THEN 50
    WHEN 'low' THEN 25
    ELSE NULL
  END;

  IF v_priority_value IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid priority value');
  END IF;

  -- Update priorities
  WITH updated AS (
    UPDATE execution_queue SET
      priority = v_priority_value
    WHERE run_id = p_run_id
      AND id = ANY(p_item_ids)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RETURN jsonb_build_object('success', true, 'updated_count', v_updated_count);
END;
$$;


-- ============================================================
-- Function 5: remove_from_queue
-- Removes items from the queue
-- ============================================================
CREATE OR REPLACE FUNCTION remove_from_queue(
  p_run_id UUID,
  p_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed_count INTEGER;
BEGIN
  -- Mark as skipped (soft delete from queue)
  WITH updated AS (
    UPDATE execution_queue SET
      status = 'skipped',
      completed_at = NOW()
    WHERE run_id = p_run_id
      AND id = ANY(p_item_ids)
      AND status = 'queued'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_removed_count FROM updated;

  -- Recompact positions
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
    FROM execution_queue
    WHERE run_id = p_run_id
      AND status = 'queued'
  )
  UPDATE execution_queue eq SET
    position = r.new_pos
  FROM ranked r
  WHERE eq.id = r.id;

  RETURN jsonb_build_object('success', true, 'removed_count', v_removed_count);
END;
$$;


-- ============================================================
-- Function 6: get_queue_items
-- Retrieves queue items with filtering and sorting
-- ============================================================
CREATE OR REPLACE FUNCTION get_queue_items(
  p_run_id UUID,
  p_priority_filter TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'position',
  p_sort_order TEXT DEFAULT 'asc',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB;
  v_total INTEGER;
BEGIN
  -- Count total matching
  SELECT COUNT(*) INTO v_total
  FROM execution_queue eq
  JOIN test_cases tc ON eq.test_case_id = tc.id
  WHERE eq.run_id = p_run_id
    AND eq.status = 'queued'
    AND (p_priority_filter IS NULL OR tc.priority = p_priority_filter)
    AND (p_search_query IS NULL OR 
         tc.title ILIKE '%' || p_search_query || '%' OR
         tc.case_number ILIKE '%' || p_search_query || '%');

  -- Get items with dynamic ordering
  SELECT COALESCE(
    jsonb_agg(item ORDER BY sort_key),
    '[]'::jsonb
  ) INTO v_items
  FROM (
    SELECT 
      jsonb_build_object(
        'id', eq.id,
        'position', eq.position,
        'priority', eq.priority,
        'status', eq.status,
        'test_case', jsonb_build_object(
          'id', tc.id,
          'case_number', tc.case_number,
          'title', tc.title,
          'priority', tc.priority
        ),
        'estimated_time', 60,
        'created_at', eq.created_at
      ) as item,
      CASE p_sort_by
        WHEN 'position' THEN 
          CASE WHEN p_sort_order = 'asc' THEN eq.position ELSE -eq.position END
        WHEN 'priority' THEN 
          CASE WHEN p_sort_order = 'asc' THEN eq.priority ELSE -eq.priority END
        ELSE eq.position
      END as sort_key
    FROM execution_queue eq
    JOIN test_cases tc ON eq.test_case_id = tc.id
    WHERE eq.run_id = p_run_id
      AND eq.status = 'queued'
      AND (p_priority_filter IS NULL OR tc.priority = p_priority_filter)
      AND (p_search_query IS NULL OR 
           tc.title ILIKE '%' || p_search_query || '%' OR
           tc.case_number ILIKE '%' || p_search_query || '%')
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;


-- ============================================================
-- Function 7: sort_queue_by_priority
-- Reorders entire queue by priority (highest first)
-- ============================================================
CREATE OR REPLACE FUNCTION sort_queue_by_priority(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reassign positions by priority
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY priority DESC, position ASC
    ) as new_pos
    FROM execution_queue
    WHERE run_id = p_run_id
      AND status = 'queued'
  )
  UPDATE execution_queue eq SET
    position = r.new_pos
  FROM ranked r
  WHERE eq.id = r.id;

  RETURN jsonb_build_object('success', true);
END;
$$;