-- Drop the broken trigger and function with CASCADE
DROP TRIGGER IF EXISTS update_feature_progress_trigger ON stories CASCADE;
DROP TRIGGER IF EXISTS feature_progress_trigger ON stories CASCADE;
DROP FUNCTION IF EXISTS update_feature_progress() CASCADE;

-- Create a simplified version that just updates the timestamp
CREATE OR REPLACE FUNCTION update_feature_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features SET
    updated_at = NOW()
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_feature_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON stories
FOR EACH ROW
EXECUTE FUNCTION update_feature_progress();