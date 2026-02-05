-- ══════════════════════════════════════════════════════════════
-- MIGRATION: Add advance week planning support for Task10
-- ══════════════════════════════════════════════════════════════

-- Step 1: Add is_upcoming column to t10_weeks
ALTER TABLE t10_weeks 
ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT false;

-- Step 2: Create the t10_create_list function
CREATE OR REPLACE FUNCTION t10_create_list(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_week_offset INTEGER DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_id UUID;
  v_week_id UUID;
  v_key TEXT;
  v_week_start DATE;
  v_week_end DATE;
  v_this_monday DATE;
  v_is_current BOOLEAN;
  v_is_upcoming BOOLEAN;
  v_next_key_num INTEGER;
BEGIN
  -- Validate offset (0-4 weeks ahead)
  IF p_week_offset < 0 THEN
    RAISE EXCEPTION 'Cannot create lists for past weeks';
  END IF;
  
  IF p_week_offset > 4 THEN
    RAISE EXCEPTION 'Cannot create lists more than 4 weeks in advance';
  END IF;

  -- Calculate this Monday (1 = Monday for DOW where 0 = Sunday)
  -- EXTRACT(DOW) returns 0 for Sunday, 1 for Monday, etc.
  v_this_monday := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7);
  
  -- If today is Saturday(6) or Sunday(0), "this week" means the coming Monday
  IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
    v_this_monday := CURRENT_DATE + (8 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7;
  END IF;
  
  -- Calculate target week
  v_week_start := v_this_monday + (p_week_offset * 7);
  v_week_end := v_week_start + 4; -- Friday
  
  -- Determine is_current vs is_upcoming
  IF v_week_start <= CURRENT_DATE AND CURRENT_DATE <= v_week_end THEN
    v_is_current := true;
    v_is_upcoming := false;
  ELSE
    v_is_current := false;
    v_is_upcoming := true;
  END IF;

  -- Generate next list key for this user
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(key, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1 INTO v_next_key_num
  FROM t10_lists
  WHERE created_by = auth.uid();
  
  v_key := 'T10-' || LPAD(v_next_key_num::TEXT, 3, '0');

  -- Create list
  INSERT INTO t10_lists (key, name, description, created_by, status)
  VALUES (v_key, p_name, p_description, auth.uid(), 'active')
  RETURNING id INTO v_list_id;

  -- Create initial week
  INSERT INTO t10_weeks (list_id, week_start, week_end, is_current, is_upcoming, status)
  VALUES (v_list_id, v_week_start, v_week_end, v_is_current, v_is_upcoming, 'active')
  RETURNING id INTO v_week_id;

  -- Return created data
  RETURN json_build_object(
    'list_id', v_list_id,
    'list_key', v_key,
    'list_name', p_name,
    'week_id', v_week_id,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'is_current', v_is_current,
    'is_upcoming', v_is_upcoming
  );
END;
$$;

-- Step 3: Create the t10_promote_upcoming_weeks function (for future cron or on-access)
CREATE OR REPLACE FUNCTION t10_promote_upcoming_weeks()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find upcoming weeks whose start date has arrived
  UPDATE t10_weeks
  SET 
    is_upcoming = false,
    is_current = true,
    updated_at = NOW()
  WHERE 
    is_upcoming = true
    AND week_start <= CURRENT_DATE;
    
  -- Demote old current weeks for same list
  UPDATE t10_weeks w1
  SET is_current = false
  WHERE w1.is_current = true
    AND EXISTS (
      SELECT 1 FROM t10_weeks w2
      WHERE w2.list_id = w1.list_id
        AND w2.is_current = true
        AND w2.week_start > w1.week_start
    )
    AND w1.week_start < (
      SELECT MAX(w3.week_start)
      FROM t10_weeks w3
      WHERE w3.list_id = w1.list_id
        AND w3.is_current = true
    );
END;
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION t10_create_list(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION t10_promote_upcoming_weeks() TO authenticated;