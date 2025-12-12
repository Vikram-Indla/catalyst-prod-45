-- ==============================================
-- EPIC KEY MIGRATION: Enforce 3-letter key format
-- ==============================================

-- Step 1: Fix program keys to 3 letters
-- DT Program: DTPROGRAM → DTP
UPDATE programs 
SET key = 'DTP' 
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' 
AND key = 'DTPROGRAM';

-- Default program: DEFAULT → DEF (but keep name "Default")
UPDATE programs 
SET key = 'DEF' 
WHERE id = '00000000-0000-0000-0000-000000000001' 
AND key = 'DEFAULT';

-- Store old key in aliases for backward compatibility
INSERT INTO program_key_aliases (program_id, old_key)
SELECT 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'DTPROGRAM'
WHERE NOT EXISTS (
  SELECT 1 FROM program_key_aliases 
  WHERE program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' 
  AND old_key = 'DTPROGRAM'
);

INSERT INTO program_key_aliases (program_id, old_key)
SELECT '00000000-0000-0000-0000-000000000001', 'DEFAULT'
WHERE NOT EXISTS (
  SELECT 1 FROM program_key_aliases 
  WHERE program_id = '00000000-0000-0000-0000-000000000001' 
  AND old_key = 'DEFAULT'
);

-- Step 2: Create sequence tracking table for epic keys
CREATE TABLE IF NOT EXISTS epic_key_sequences (
  program_id UUID PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Function to generate next epic key
CREATE OR REPLACE FUNCTION generate_next_epic_key(p_program_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_program_key TEXT;
  v_next_seq INTEGER;
BEGIN
  -- Get the program's 3-letter key
  SELECT key INTO v_program_key
  FROM programs
  WHERE id = p_program_id;
  
  IF v_program_key IS NULL THEN
    RAISE EXCEPTION 'Program not found: %', p_program_id;
  END IF;
  
  -- Validate program key is exactly 3 uppercase letters
  IF v_program_key !~ '^[A-Z]{3}$' THEN
    -- Extract first 3 letters as fallback
    v_program_key := UPPER(LEFT(REGEXP_REPLACE(v_program_key, '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(v_program_key) < 3 THEN
      v_program_key := 'PRG';
    END IF;
  END IF;
  
  -- Get or create sequence
  INSERT INTO epic_key_sequences (program_id, last_sequence)
  VALUES (p_program_id, 0)
  ON CONFLICT (program_id) DO NOTHING;
  
  -- Increment and get the next sequence
  UPDATE epic_key_sequences
  SET last_sequence = last_sequence + 1, updated_at = NOW()
  WHERE program_id = p_program_id
  RETURNING last_sequence INTO v_next_seq;
  
  -- Return formatted key: AAA-###
  RETURN v_program_key || '-' || LPAD(v_next_seq::TEXT, 3, '0');
END;
$$;

-- Step 4: Initialize sequences based on existing epic keys
INSERT INTO epic_key_sequences (program_id, last_sequence)
SELECT 
  e.primary_program_id,
  COALESCE(MAX(
    CASE 
      WHEN e.epic_key ~ '-\d+$' THEN 
        CAST(REGEXP_REPLACE(e.epic_key, '.*-', '') AS INTEGER)
      ELSE 0
    END
  ), 0) AS max_seq
FROM epics e
WHERE e.primary_program_id IS NOT NULL
AND e.deleted_at IS NULL
GROUP BY e.primary_program_id
ON CONFLICT (program_id) DO UPDATE
SET last_sequence = GREATEST(epic_key_sequences.last_sequence, EXCLUDED.last_sequence);

-- Step 5: Migrate invalid epic keys to new format
-- First, migrate epics under DT Program (DTP)
WITH numbered_epics AS (
  SELECT 
    id,
    epic_key,
    ROW_NUMBER() OVER (ORDER BY created_at, id) + 
      COALESCE((SELECT last_sequence FROM epic_key_sequences WHERE program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'), 0) as new_seq
  FROM epics
  WHERE primary_program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND deleted_at IS NULL
  AND (epic_key IS NULL OR epic_key !~ '^[A-Z]{3}-\d{3}$')
)
UPDATE epics e
SET epic_key = 'DTP-' || LPAD(ne.new_seq::TEXT, 3, '0')
FROM numbered_epics ne
WHERE e.id = ne.id;

-- Update sequence tracker
UPDATE epic_key_sequences
SET last_sequence = (
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(epic_key, '.*-', '') AS INTEGER)
  ), 0)
  FROM epics
  WHERE primary_program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND epic_key ~ '^[A-Z]{3}-\d{3}$'
)
WHERE program_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- Step 6: Add trigger to auto-generate epic keys on insert
CREATE OR REPLACE FUNCTION auto_generate_epic_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate if epic_key is null and program_id exists
  IF NEW.epic_key IS NULL AND NEW.primary_program_id IS NOT NULL THEN
    NEW.epic_key := generate_next_epic_key(NEW.primary_program_id);
  END IF;
  
  -- Validate epic_key format if provided
  IF NEW.epic_key IS NOT NULL AND NEW.epic_key !~ '^[A-Z]{3}-\d{3}$' THEN
    RAISE EXCEPTION 'Invalid epic key format: %. Must be AAA-### (3 uppercase letters, hyphen, 3 digits)', NEW.epic_key;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trigger_auto_generate_epic_key ON epics;
CREATE TRIGGER trigger_auto_generate_epic_key
  BEFORE INSERT ON epics
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_epic_key();

-- Step 7: Add check constraint for program key format (3 letters only)
-- Note: This will fail if any existing program keys don't match - run migration first
ALTER TABLE programs 
DROP CONSTRAINT IF EXISTS programs_key_format_check;

-- We can't add the constraint yet if there are invalid keys
-- Instead, add a trigger to validate new/updated program keys
CREATE OR REPLACE FUNCTION validate_program_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow DEFAULT key for the system default program
  IF NEW.id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;
  
  -- Validate key format: exactly 3 uppercase letters
  IF NEW.key !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid program key format: %. Must be exactly 3 uppercase letters (A-Z)', NEW.key;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_program_key ON programs;
CREATE TRIGGER trigger_validate_program_key
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION validate_program_key();