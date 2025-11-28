-- Program Board: Add team_target_completion_sprint field to features table
-- This field is visual-only and does NOT impact Target Start/Completion
-- Source: help.jiraalign.com-Program board.pdf page 5
-- "Edits to this field from the program board results in a visual change only"

ALTER TABLE features
ADD COLUMN IF NOT EXISTS team_target_completion_sprint_id uuid REFERENCES iterations(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_features_team_target_completion_sprint 
  ON features(team_target_completion_sprint_id);

COMMENT ON COLUMN features.team_target_completion_sprint_id IS 
'Visual-only sprint assignment for Program Board. Does not impact Target Start/Completion dates. Independent from iteration_id field.';

-- Program Board: Add orphan tracking fields
ALTER TABLE features
ADD COLUMN IF NOT EXISTS is_orphan_on_board boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS orphan_board_teams text[] DEFAULT '{}';

COMMENT ON COLUMN features.is_orphan_on_board IS 
'Tracks if this orphan feature (no child stories) is manually added to Program Board';

COMMENT ON COLUMN features.orphan_board_teams IS 
'Array of team IDs where this orphan feature is displayed on Program Board';

-- Program Board: Add feature scheduling history table
CREATE TABLE IF NOT EXISTS feature_scheduling_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  start_sprint_id uuid REFERENCES iterations(id),
  end_sprint_id uuid REFERENCES iterations(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_scheduling_history_feature 
  ON feature_scheduling_history(feature_id);

COMMENT ON TABLE feature_scheduling_history IS 
'Logs changes to Team Target Completion Sprint field for Feature History report';

-- Program Board: Add team ranking table
CREATE TABLE IF NOT EXISTS program_team_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_program_team_rankings_program 
  ON program_team_rankings(program_id, rank_order);

COMMENT ON TABLE program_team_rankings IS 
'Stores team display order for Program Board swimlanes';