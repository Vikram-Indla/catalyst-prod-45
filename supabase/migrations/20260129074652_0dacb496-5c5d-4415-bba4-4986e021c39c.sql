-- ============================================================
-- WORKSTREAM-BASED TASK KEY SYSTEM
-- Task keys use workstream's 3-letter prefix (e.g., CAT-001)
-- ============================================================

-- 1. Add key_prefix column to planner_workstreams (3-letter code)
ALTER TABLE planner_workstreams 
ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(10);

-- 2. Set initial key_prefix values based on name (first 3 letters uppercase)
UPDATE planner_workstreams 
SET key_prefix = UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 3))
WHERE key_prefix IS NULL;

-- 3. Create sequence table for workstream task keys
CREATE TABLE IF NOT EXISTS workstream_task_key_sequences (
  workstream_id UUID PRIMARY KEY REFERENCES planner_workstreams(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Enable RLS on sequence table
ALTER TABLE workstream_task_key_sequences ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage sequences
CREATE POLICY "Allow all authenticated users to manage sequences"
ON workstream_task_key_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Initialize sequences from existing tasks
INSERT INTO workstream_task_key_sequences (workstream_id, last_sequence)
SELECT DISTINCT workstream_id, 0
FROM planner_tasks
WHERE workstream_id IS NOT NULL
ON CONFLICT (workstream_id) DO NOTHING;

-- Also add any workstreams that don't have tasks yet
INSERT INTO workstream_task_key_sequences (workstream_id, last_sequence)
SELECT id, 0
FROM planner_workstreams
WHERE id NOT IN (SELECT workstream_id FROM workstream_task_key_sequences WHERE workstream_id IS NOT NULL)
ON CONFLICT (workstream_id) DO NOTHING;

-- 6. Create function to generate task key based on workstream prefix
CREATE OR REPLACE FUNCTION generate_workstream_task_key(p_workstream_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INTEGER;
  v_task_key VARCHAR(50);
BEGIN
  -- Get the workstream prefix
  SELECT key_prefix INTO v_prefix
  FROM planner_workstreams
  WHERE id = p_workstream_id;
  
  IF v_prefix IS NULL THEN
    -- Fallback to PLN if no workstream
    v_prefix := 'PLN';
  END IF;
  
  -- Ensure sequence record exists
  INSERT INTO workstream_task_key_sequences (workstream_id, last_sequence)
  VALUES (p_workstream_id, 0)
  ON CONFLICT (workstream_id) DO NOTHING;
  
  -- Get and increment sequence atomically
  UPDATE workstream_task_key_sequences
  SET last_sequence = last_sequence + 1, updated_at = now()
  WHERE workstream_id = p_workstream_id
  RETURNING last_sequence INTO v_sequence;
  
  -- Format as PREFIX-001
  v_task_key := v_prefix || '-' || LPAD(v_sequence::text, 1, '0');
  
  RETURN v_task_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to migrate existing tasks to new key format
CREATE OR REPLACE FUNCTION migrate_tasks_to_workstream_keys()
RETURNS void AS $$
DECLARE
  ws RECORD;
  t RECORD;
  v_seq INTEGER;
BEGIN
  -- For each workstream
  FOR ws IN SELECT id, key_prefix FROM planner_workstreams LOOP
    v_seq := 0;
    
    -- Get all tasks for this workstream ordered by creation
    FOR t IN 
      SELECT id 
      FROM planner_tasks 
      WHERE workstream_id = ws.id 
      ORDER BY created_at
    LOOP
      v_seq := v_seq + 1;
      
      -- Update task key
      UPDATE planner_tasks 
      SET task_key = ws.key_prefix || '-' || v_seq
      WHERE id = t.id;
    END LOOP;
    
    -- Update the sequence counter
    UPDATE workstream_task_key_sequences
    SET last_sequence = v_seq, updated_at = now()
    WHERE workstream_id = ws.id;
    
    -- Insert if not exists
    IF NOT FOUND THEN
      INSERT INTO workstream_task_key_sequences (workstream_id, last_sequence)
      VALUES (ws.id, v_seq);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Run the migration
SELECT migrate_tasks_to_workstream_keys();

-- 9. Create trigger function to update task keys when workstream prefix changes
CREATE OR REPLACE FUNCTION update_task_keys_on_prefix_change()
RETURNS TRIGGER AS $$
DECLARE
  t RECORD;
  v_seq INTEGER;
BEGIN
  -- Only run if key_prefix actually changed
  IF OLD.key_prefix IS DISTINCT FROM NEW.key_prefix THEN
    v_seq := 0;
    
    -- Update all tasks for this workstream
    FOR t IN 
      SELECT id 
      FROM planner_tasks 
      WHERE workstream_id = NEW.id 
      ORDER BY created_at
    LOOP
      v_seq := v_seq + 1;
      
      UPDATE planner_tasks 
      SET task_key = NEW.key_prefix || '-' || v_seq
      WHERE id = t.id;
    END LOOP;
    
    -- Update sequence counter
    UPDATE workstream_task_key_sequences
    SET last_sequence = v_seq, updated_at = now()
    WHERE workstream_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create the trigger
DROP TRIGGER IF EXISTS trg_update_task_keys_on_prefix_change ON planner_workstreams;
CREATE TRIGGER trg_update_task_keys_on_prefix_change
AFTER UPDATE OF key_prefix ON planner_workstreams
FOR EACH ROW
EXECUTE FUNCTION update_task_keys_on_prefix_change();

-- 11. Verify migration results
-- SELECT w.name, w.key_prefix, t.task_key, t.title 
-- FROM planner_tasks t 
-- LEFT JOIN planner_workstreams w ON t.workstream_id = w.id 
-- ORDER BY w.name, t.created_at
-- LIMIT 30;