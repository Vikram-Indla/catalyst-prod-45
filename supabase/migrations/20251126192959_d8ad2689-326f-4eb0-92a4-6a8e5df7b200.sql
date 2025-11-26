
-- Fix forecast_entries constraint to allow PI-level estimates
-- Required for Jira Align Forecast tab where PI estimate has both program_id and team_id NULL

-- Drop the existing constraint that blocks PI-level entries
ALTER TABLE public.forecast_entries 
DROP CONSTRAINT IF EXISTS forecast_entries_scope_check;

-- Add new constraint that allows three valid scope combinations:
-- 1. PI-level: program_id IS NULL AND team_id IS NULL (pi estimate)
-- 2. Program-level: program_id IS NOT NULL AND team_id IS NULL (program estimate)
-- 3. Team-level: program_id IS NULL AND team_id IS NOT NULL (team estimate)
ALTER TABLE public.forecast_entries 
ADD CONSTRAINT forecast_entries_scope_check CHECK (
  (program_id IS NULL AND team_id IS NULL) OR 
  (program_id IS NOT NULL AND team_id IS NULL) OR 
  (program_id IS NULL AND team_id IS NOT NULL)
);

COMMENT ON CONSTRAINT forecast_entries_scope_check ON public.forecast_entries IS 
  'Allows three scope levels: PI (both NULL), Program (program_id set), Team (team_id set)';
