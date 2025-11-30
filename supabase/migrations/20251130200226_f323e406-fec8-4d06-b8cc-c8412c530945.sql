-- Add activity log trigger to stories table for automatic change tracking

-- Create trigger to log all story changes
CREATE TRIGGER log_story_activity
  AFTER INSERT OR UPDATE OR DELETE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();