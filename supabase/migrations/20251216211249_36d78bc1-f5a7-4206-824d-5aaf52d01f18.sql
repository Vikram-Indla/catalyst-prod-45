-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS trigger_sync_objective_dates ON objectives;
DROP FUNCTION IF EXISTS sync_objective_dates() CASCADE;