-- P3-F5: Normalize defect keys to zero-padded 5-digit format (DEF-00001, DEF-00002, etc.)

-- Step 1: Normalize existing defect_key values
-- Extract numeric part, convert to 5-digit zero-padded, rebuild key
UPDATE tm_defects
SET defect_key = 'DEF-' || LPAD(
  (regexp_matches(defect_key, '(\d+)$'))[1],
  5,
  '0'
)
WHERE defect_key ~ '^DEF-\d+$';

-- Step 2: Update tm_next_entity_key() RPC to use zero-padded format
-- This RPC generates the next sequential key for an entity type
CREATE OR REPLACE FUNCTION tm_next_entity_key(p_entity_type TEXT)
RETURNS TEXT LANGUAGE PLPGSQL STABLE
AS $$
DECLARE
  v_entity_key TEXT;
  v_next_seq INT;
BEGIN
  -- Get the next sequence number for this entity type
  CASE p_entity_type
    WHEN 'defect' THEN
      SELECT COALESCE(MAX(
        (regexp_matches(defect_key, '(\d+)$'))[1]::INT
      ), 0) + 1
      INTO v_next_seq
      FROM tm_defects
      WHERE defect_key ~ '^DEF-\d+$';
      v_entity_key := 'DEF-' || LPAD(v_next_seq::TEXT, 5, '0');

    WHEN 'test_case' THEN
      SELECT COALESCE(MAX(
        (regexp_matches(case_key, '(\d+)$'))[1]::INT
      ), 0) + 1
      INTO v_next_seq
      FROM tm_test_cases
      WHERE case_key ~ '^TC-\d+$';
      v_entity_key := 'TC-' || LPAD(v_next_seq::TEXT, 5, '0');

    WHEN 'test_cycle' THEN
      SELECT COALESCE(MAX(
        (regexp_matches(cycle_key, '(\d+)$'))[1]::INT
      ), 0) + 1
      INTO v_next_seq
      FROM tm_test_cycles
      WHERE cycle_key ~ '^CYCLE-\d+$';
      v_entity_key := 'CYCLE-' || LPAD(v_next_seq::TEXT, 5, '0');

    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  RETURN v_entity_key;
END;
$$;

-- Grant execute on RPC
GRANT EXECUTE ON FUNCTION tm_next_entity_key(TEXT) TO authenticated;
