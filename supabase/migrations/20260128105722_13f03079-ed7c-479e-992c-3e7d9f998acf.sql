-- Drop existing function first, then recreate (CASCADE drops dependent trigger)
DROP FUNCTION IF EXISTS generate_planner_task_key() CASCADE;

-- Create the sequence for planner task keys starting after current max (55)
CREATE SEQUENCE IF NOT EXISTS planner_task_key_seq START WITH 56;

-- Create a function to generate the next task key
CREATE OR REPLACE FUNCTION generate_planner_task_key()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('planner_task_key_seq');
  RETURN 'PLN-' || next_val;
END;
$$ LANGUAGE plpgsql;

-- Fix the broken task key (skip if column doesn't exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='task_key') THEN
    UPDATE planner_tasks SET task_key = generate_planner_task_key() WHERE task_key = 'PLN-1769597736915';
  END IF;
END $$;