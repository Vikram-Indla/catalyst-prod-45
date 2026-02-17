
-- Disable only the user-defined trigger
ALTER TABLE planner_workstreams DISABLE TRIGGER trg_update_task_keys_on_prefix_change;

-- Update all workstream prefixes to TSK
UPDATE planner_workstreams SET key_prefix = 'TSK' WHERE key_prefix IS NOT NULL AND key_prefix != 'TSK';

-- Drop the trigger since we now use global TSK numbering
DROP TRIGGER IF EXISTS trg_update_task_keys_on_prefix_change ON planner_workstreams;
DROP FUNCTION IF EXISTS update_task_keys_on_prefix_change();

-- Update the generate_workstream_task_key function to always use TSK prefix with global sequence
CREATE OR REPLACE FUNCTION public.generate_workstream_task_key(p_workstream_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_existing INTEGER;
  v_task_key VARCHAR(50);
BEGIN
  -- Find the current max TSK number across ALL tasks
  SELECT COALESCE(MAX(
    CASE 
      WHEN task_key ~ '^TSK-[0-9]+$' 
      THEN CAST(SUBSTRING(task_key FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_max_existing
  FROM planner_tasks;

  v_task_key := 'TSK-' || v_max_existing;
  RETURN v_task_key;
END;
$$;
