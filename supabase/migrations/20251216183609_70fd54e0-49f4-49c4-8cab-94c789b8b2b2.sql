-- Phase A: Backfill and add columns for due_date → end_date migration

-- 1. Backfill objectives.end_date from due_date where end_date is null
UPDATE objectives 
SET end_date = due_date 
WHERE end_date IS NULL AND due_date IS NOT NULL;

-- 2. Add start_date and end_date columns to key_results table
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- 3. Create a compatibility trigger to keep due_date and end_date in sync during migration
-- When end_date is updated, sync to due_date (for backwards compatibility)
CREATE OR REPLACE FUNCTION sync_objective_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If end_date is being set and due_date is different or null, sync them
  IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
    NEW.due_date := NEW.end_date;
  -- If due_date is being set and end_date is different or null, sync them
  ELSIF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    NEW.end_date := NEW.due_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_objective_dates ON objectives;
CREATE TRIGGER trigger_sync_objective_dates
  BEFORE INSERT OR UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION sync_objective_dates();