-- Fix function security: Add search_path to function
CREATE OR REPLACE FUNCTION update_feature_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE features SET
    story_points_total = (
      SELECT COALESCE(SUM(story_points), 0) FROM stories WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id)
    ),
    story_points_accepted = (
      SELECT COALESCE(SUM(story_points), 0) FROM stories 
      WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id) AND state = 'Accepted'
    ),
    stories_total = (
      SELECT COUNT(*) FROM stories WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id)
    ),
    stories_accepted = (
      SELECT COUNT(*) FROM stories 
      WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id) AND state = 'Accepted'
    ),
    stories_delivered = (
      SELECT COUNT(*) FROM stories 
      WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id) AND state IN ('Testing', 'Tested', 'Accepted')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public';