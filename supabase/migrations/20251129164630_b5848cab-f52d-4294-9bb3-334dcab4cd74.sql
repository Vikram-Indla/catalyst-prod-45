-- Now that data is fixed, add constraint for pyramid levels
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_level_check;

ALTER TABLE goals ADD CONSTRAINT goals_level_check 
  CHECK (level IN ('mission', 'vision', 'value', 'north_star', 'long_term_goal', 'long_term_strategy', 'yearly_goal', 'strategic_goal', 'portfolio', 'program', 'team'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_level_snapshot ON goals(level, snapshot_id);