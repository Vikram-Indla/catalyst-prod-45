-- Make objective_level_id nullable temporarily
ALTER TABLE objectives ALTER COLUMN objective_level_id DROP NOT NULL;

-- Add missing columns to strategic_goals
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS tier VARCHAR(50);
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES strategic_goals(id);
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS complete_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS score DECIMAL(3,2);
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE strategic_goals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'not_started';

-- Create key results table for strategic goals
CREATE TABLE IF NOT EXISTS strategic_goal_key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategic_goal_id UUID NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    measurement_type VARCHAR(50) NOT NULL,
    baseline_value DECIMAL(15,2) DEFAULT 0,
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    score DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parent_goal_id to objectives
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES strategic_goals(id);

-- Update tier values
UPDATE objectives SET tier = 'portfolio' WHERE tier = 'portfolio_objective';
UPDATE objectives SET tier = 'program' WHERE tier = 'program_objective';
UPDATE objectives SET tier = 'team' WHERE tier = 'team_objective' OR tier IS NULL;

-- Migrate strategic_goal data
INSERT INTO strategic_goals (id, title, description, tier, parent_goal_id, snapshot_id, score, owner_id, status)
SELECT id, summary, description, 'yearly_goal', parent_objective_id, snapshot_id, 
       COALESCE(confidence_score, score), owner_id, COALESCE(status, 'not_started')
FROM objectives WHERE tier = 'strategic_goal'
ON CONFLICT (id) DO NOTHING;

-- Delete migrated goals
DELETE FROM objectives WHERE tier = 'strategic_goal';

-- Update constraints
ALTER TABLE objectives DROP CONSTRAINT IF EXISTS objectives_tier_check;
ALTER TABLE objectives ADD CONSTRAINT objectives_tier_check 
CHECK (tier IN ('portfolio', 'program', 'team'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent ON strategic_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_tier ON strategic_goals(tier);
CREATE INDEX IF NOT EXISTS idx_objectives_parent_goal ON objectives(parent_goal_id);

COMMENT ON TABLE strategic_goals IS 'Strategy layer: North Star → Long-term Goal → Long-term Strategy → Yearly Goal';
COMMENT ON COLUMN objectives.parent_goal_id IS 'Portfolio objectives link to Yearly Goals';