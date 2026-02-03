-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK¹⁰ COMPLETED LISTS — DATABASE ADDITIONS
-- Purpose: Support verification view with checkout tracking and carried forward
-- ═══════════════════════════════════════════════════════════════════════════════

-- -----------------------------------------------------------------------------
-- STEP 1: ALTER t10_weeks — Add checkout tracking
-- -----------------------------------------------------------------------------

-- Add checkout tracking columns
ALTER TABLE t10_weeks 
ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checkout_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS carried_forward_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dropped_count INTEGER DEFAULT 0;

-- Add check constraints separately (not in ADD COLUMN to avoid immutability issues)
DO $$ BEGIN
  ALTER TABLE t10_weeks ADD CONSTRAINT t10_weeks_carried_forward_count_check CHECK (carried_forward_count >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE t10_weeks ADD CONSTRAINT t10_weeks_dropped_count_check CHECK (dropped_count >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add index for completed weeks queries
CREATE INDEX IF NOT EXISTS idx_t10_weeks_status_completed 
ON t10_weeks(status, checkout_at DESC) 
WHERE status = 'completed';

COMMENT ON COLUMN t10_weeks.checkout_at IS 'Timestamp when week was checked out (completed)';
COMMENT ON COLUMN t10_weeks.checkout_by IS 'User who performed the checkout';
COMMENT ON COLUMN t10_weeks.carried_forward_count IS 'Number of items carried to next week';
COMMENT ON COLUMN t10_weeks.dropped_count IS 'Number of items dropped without completion';

-- -----------------------------------------------------------------------------
-- STEP 2: ALTER t10_items — Add item outcome tracking
-- -----------------------------------------------------------------------------

-- Update status check constraint to include new values
ALTER TABLE t10_items 
DROP CONSTRAINT IF EXISTS t10_items_status_check;

ALTER TABLE t10_items 
ADD CONSTRAINT t10_items_status_check 
CHECK (status IN ('todo', 'done', 'completed', 'carried_forward', 'dropped'));

-- Add completed_at timestamp for audit
ALTER TABLE t10_items 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS carried_from_week_id UUID REFERENCES t10_weeks(id) ON DELETE SET NULL;

-- Index for completed items
CREATE INDEX IF NOT EXISTS idx_t10_items_status_completed 
ON t10_items(status) 
WHERE status IN ('completed', 'carried_forward', 'dropped');

CREATE INDEX IF NOT EXISTS idx_t10_items_completed_at 
ON t10_items(completed_at DESC) 
WHERE completed_at IS NOT NULL;

COMMENT ON COLUMN t10_items.completed_at IS 'Timestamp when item was marked complete';
COMMENT ON COLUMN t10_items.carried_from_week_id IS 'If carried forward, reference to origin week';

-- -----------------------------------------------------------------------------
-- STEP 3: CREATE VIEW — t10_completed_weeks_summary
-- Purpose: Summary of completed weeks for table display
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS t10_completed_weeks_summary CASCADE;

CREATE VIEW t10_completed_weeks_summary AS
SELECT 
  w.id AS week_id,
  w.list_id,
  w.week_start,
  w.week_end,
  w.status AS week_status,
  w.checkout_at,
  w.checkout_by,
  
  -- List info
  l.key AS list_key,
  l.name AS list_name,
  
  -- Checkout user info
  cp.full_name AS checkout_by_name,
  cp.avatar_url AS checkout_by_avatar,
  
  -- Counts (use stored values, fallback to calculated)
  COALESCE(w.total_count, (
    SELECT COUNT(*) FROM t10_items WHERE week_id = w.id
  )) AS total_count,
  
  COALESCE(w.completed_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status IN ('done', 'completed')
  )) AS completed_count,
  
  COALESCE(w.carried_forward_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status = 'carried_forward'
  )) AS carried_forward_count,
  
  COALESCE(w.dropped_count, (
    SELECT COUNT(*) FROM t10_items 
    WHERE week_id = w.id AND status = 'dropped'
  )) AS dropped_count,
  
  -- Calculate completion rate
  CASE 
    WHEN COALESCE(w.total_count, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(w.completed_count, 0)::DECIMAL / 
       COALESCE(w.total_count, 1)) * 100, 
      1
    )
  END AS completion_rate,
  
  -- Week number within list
  ROW_NUMBER() OVER (
    PARTITION BY w.list_id 
    ORDER BY w.week_start ASC
  ) AS week_number,
  
  -- Total weeks in list (for "Week X of Y")
  COUNT(*) OVER (PARTITION BY w.list_id) AS total_weeks_in_list

FROM t10_weeks w
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN profiles cp ON w.checkout_by = cp.id
WHERE w.status = 'completed'
ORDER BY w.checkout_at DESC NULLS LAST, w.week_end DESC;

COMMENT ON VIEW t10_completed_weeks_summary IS 'Task¹⁰ completed weeks - for verification table with all stats';

-- -----------------------------------------------------------------------------
-- STEP 4: CREATE VIEW — t10_completed_items_detail
-- Purpose: Detailed items for expanded row verification
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS t10_completed_items_detail CASCADE;

CREATE VIEW t10_completed_items_detail AS
SELECT 
  i.id AS item_id,
  i.week_id,
  i.rank,
  i.title,
  i.description,
  i.taskhub_key,
  i.due_date,
  i.status AS item_status,
  i.completed_at,
  i.carryover_count,
  i.is_buffer,
  i.carried_from_week_id,
  i.created_at AS item_created_at,
  
  -- Assignee info
  i.assignee_id,
  ap.full_name AS assignee_name,
  ap.avatar_url AS assignee_avatar,
  
  -- Week info
  w.week_start,
  w.week_end,
  w.list_id,
  
  -- List info
  l.key AS list_key,
  l.name AS list_name,
  
  -- Labels as JSON array
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', lb.id,
          'name', lb.name,
          'color', lb.color
        )
        ORDER BY lb.name
      )
      FROM t10_item_labels il
      JOIN t10_labels lb ON il.label_id = lb.id
      WHERE il.item_id = i.id
    ),
    '[]'::json
  ) AS labels

FROM t10_items i
JOIN t10_weeks w ON w.id = i.week_id
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN profiles ap ON i.assignee_id = ap.id
WHERE w.status = 'completed'
ORDER BY i.rank ASC;

COMMENT ON VIEW t10_completed_items_detail IS 'Task¹⁰ completed items - detailed view for verification';

-- -----------------------------------------------------------------------------
-- STEP 5: CREATE VIEW — t10_completed_summary_stats
-- Purpose: Aggregate stats for summary cards
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS t10_completed_summary_stats CASCADE;

CREATE VIEW t10_completed_summary_stats AS
SELECT 
  -- Total unique lists with completed weeks
  COALESCE(COUNT(DISTINCT list_id), 0)::INTEGER AS total_lists_completed,
  
  -- Total completed weeks
  COALESCE(COUNT(*), 0)::INTEGER AS total_weeks_completed,
  
  -- Average completion rate
  COALESCE(ROUND(AVG(
    CASE 
      WHEN total_count = 0 THEN 0
      ELSE (completed_count::DECIMAL / total_count) * 100
    END
  ), 1), 0)::NUMERIC AS avg_completion_rate,
  
  -- Total items completed
  COALESCE(SUM(completed_count), 0)::INTEGER AS total_items_completed,
  
  -- Total items carried forward
  COALESCE(SUM(carried_forward_count), 0)::INTEGER AS total_carried_forward,
  
  -- Total items dropped
  COALESCE(SUM(dropped_count), 0)::INTEGER AS total_dropped

FROM t10_completed_weeks_summary;

COMMENT ON VIEW t10_completed_summary_stats IS 'Task¹⁰ completed summary - aggregate stats for dashboard cards';

-- -----------------------------------------------------------------------------
-- STEP 6: CREATE VIEW — t10_list_performance
-- Purpose: Per-list performance over time (for performance modal)
-- Fixed: Cannot use window function inside aggregate - use subquery with pre-numbered rows
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS t10_list_performance CASCADE;

CREATE VIEW t10_list_performance AS
SELECT 
  l.id AS list_id,
  l.key AS list_key,
  l.name AS list_name,
  
  -- Aggregate stats
  COUNT(w.id) AS total_weeks,
  ROUND(AVG(
    CASE 
      WHEN w.total_count = 0 THEN 0
      ELSE (w.completed_count::DECIMAL / w.total_count) * 100
    END
  ), 1) AS avg_completion_rate,
  SUM(w.completed_count) AS total_completed,
  SUM(w.carried_forward_count) AS total_carried_forward,
  
  -- Week-by-week breakdown as JSON (fixed: use subquery for row numbering)
  (
    SELECT json_agg(week_data ORDER BY week_data->>'week_start' DESC)
    FROM (
      SELECT 
        json_build_object(
          'week_id', cw.id,
          'week_start', cw.week_start,
          'week_end', cw.week_end,
          'total', cw.total_count,
          'completed', cw.completed_count,
          'carried_forward', cw.carried_forward_count,
          'rate', CASE 
            WHEN cw.total_count = 0 THEN 0
            ELSE ROUND((cw.completed_count::DECIMAL / cw.total_count) * 100, 1)
          END
        ) AS week_data
      FROM t10_weeks cw
      WHERE cw.list_id = l.id AND cw.status = 'completed'
    ) sub
  ) AS weeks_breakdown,
  
  -- Most carried forward items
  (
    SELECT json_agg(
      json_build_object(
        'title', sub.title,
        'carry_count', sub.carry_count
      )
    )
    FROM (
      SELECT 
        i.title,
        COUNT(*) AS carry_count
      FROM t10_items i
      JOIN t10_weeks iw ON iw.id = i.week_id
      WHERE iw.list_id = l.id 
        AND i.status = 'carried_forward'
      GROUP BY i.title
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) sub
  ) AS recurring_carryovers

FROM t10_lists l
JOIN t10_weeks w ON w.list_id = l.id AND w.status = 'completed'
GROUP BY l.id
ORDER BY COUNT(w.id) DESC;

COMMENT ON VIEW t10_list_performance IS 'Task¹⁰ list performance - aggregate stats per list';

-- -----------------------------------------------------------------------------
-- STEP 7: CREATE FUNCTION — Checkout a week
-- Purpose: Transactional checkout that updates all item statuses
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION t10_checkout_week(
  p_week_id UUID,
  p_carry_forward_item_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_drop_item_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_count INTEGER;
  v_carried_count INTEGER;
  v_dropped_count INTEGER;
  v_total_count INTEGER;
  v_next_week_id UUID;
  v_list_id UUID;
BEGIN
  -- Get list_id for this week
  SELECT list_id INTO v_list_id FROM t10_weeks WHERE id = p_week_id;
  
  -- Mark completed items (done but not in carry/drop lists)
  UPDATE t10_items
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE week_id = p_week_id
    AND status = 'done'
    AND id != ALL(p_carry_forward_item_ids)
    AND id != ALL(p_drop_item_ids);
  
  -- Mark carried forward items
  UPDATE t10_items
  SET 
    status = 'carried_forward',
    updated_at = now()
  WHERE week_id = p_week_id
    AND id = ANY(p_carry_forward_item_ids);
  
  -- Mark dropped items
  UPDATE t10_items
  SET 
    status = 'dropped',
    updated_at = now()
  WHERE week_id = p_week_id
    AND id = ANY(p_drop_item_ids);
  
  -- Mark remaining todo items as carried forward
  UPDATE t10_items
  SET 
    status = 'carried_forward',
    updated_at = now()
  WHERE week_id = p_week_id
    AND status = 'todo';
  
  -- Count outcomes
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'carried_forward'),
    COUNT(*) FILTER (WHERE status = 'dropped'),
    COUNT(*)
  INTO v_completed_count, v_carried_count, v_dropped_count, v_total_count
  FROM t10_items
  WHERE week_id = p_week_id;
  
  -- Update week record
  UPDATE t10_weeks
  SET 
    status = 'completed',
    is_current = false,
    checkout_at = now(),
    checkout_by = auth.uid(),
    completed_count = v_completed_count,
    carried_forward_count = v_carried_count,
    dropped_count = v_dropped_count,
    total_count = v_total_count,
    updated_at = now()
  WHERE id = p_week_id;
  
  -- Create next week and carry forward items (if any)
  IF v_carried_count > 0 THEN
    -- Create next week
    INSERT INTO t10_weeks (list_id, week_start, week_end, is_current, status)
    SELECT 
      v_list_id,
      week_end + INTERVAL '1 day',
      week_end + INTERVAL '7 days',
      true,
      'active'
    FROM t10_weeks
    WHERE id = p_week_id
    RETURNING id INTO v_next_week_id;
    
    -- Copy carried forward items to new week
    INSERT INTO t10_items (
      week_id, rank, title, description, taskhub_key, 
      assignee_id, due_date, status, carryover_count, 
      is_buffer, created_by, carried_from_week_id
    )
    SELECT 
      v_next_week_id,
      ROW_NUMBER() OVER (ORDER BY rank),
      title,
      description,
      taskhub_key,
      assignee_id,
      NULL, -- Clear due date for new week
      'todo',
      carryover_count + 1,
      is_buffer,
      created_by,
      p_week_id
    FROM t10_items
    WHERE week_id = p_week_id
      AND status = 'carried_forward'
    ORDER BY rank;
  END IF;
  
  -- Return summary
  RETURN json_build_object(
    'week_id', p_week_id,
    'completed_count', v_completed_count,
    'carried_forward_count', v_carried_count,
    'dropped_count', v_dropped_count,
    'total_count', v_total_count,
    'next_week_id', v_next_week_id,
    'checkout_at', now()
  );
END;
$$;

COMMENT ON FUNCTION t10_checkout_week IS 'Task¹⁰ checkout - complete a week and carry forward items';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION t10_checkout_week TO authenticated;