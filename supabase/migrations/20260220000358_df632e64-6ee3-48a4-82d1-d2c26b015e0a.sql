
-- Fix status constraint to include all needed values
ALTER TABLE es_goals DROP CONSTRAINT IF EXISTS es_goals_status_check;
ALTER TABLE es_goals ADD CONSTRAINT es_goals_status_check 
  CHECK (status IN ('not_started','in_progress','draft','active','at_risk','off_track','on_track','achieved','completed','cancelled'));
