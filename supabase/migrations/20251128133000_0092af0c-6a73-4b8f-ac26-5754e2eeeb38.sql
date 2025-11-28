-- Add missing fields to epics table for Jira Align parity

-- Epic type classification
ALTER TABLE epics ADD COLUMN IF NOT EXISTS epic_type TEXT;

-- Additional date fields
ALTER TABLE epics ADD COLUMN IF NOT EXISTS portfolio_ask_date DATE;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS initiation_date DATE;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS target_completion_date DATE;

-- Date locking
ALTER TABLE epics ADD COLUMN IF NOT EXISTS date_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS date_lock_history JSONB DEFAULT '[]'::jsonb;

-- Financial fields
ALTER TABLE epics ADD COLUMN IF NOT EXISTS capitalized BOOLEAN DEFAULT FALSE;

-- Estimation system
ALTER TABLE epics ADD COLUMN IF NOT EXISTS estimation_system TEXT DEFAULT 'wsjf';

-- Strategic fields
ALTER TABLE epics ADD COLUMN IF NOT EXISTS strategic_value_score INTEGER CHECK (strategic_value_score >= 1 AND strategic_value_score <= 100);
ALTER TABLE epics ADD COLUMN IF NOT EXISTS effort_swag INTEGER CHECK (effort_swag >= 1 AND effort_swag <= 100);
ALTER TABLE epics ADD COLUMN IF NOT EXISTS strategic_driver TEXT;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS ability_to_execute TEXT;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS quadrant TEXT;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS investment_type TEXT;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS customers TEXT[];

-- Visual
ALTER TABLE epics ADD COLUMN IF NOT EXISTS report_color TEXT DEFAULT '#3b82f6';

-- Add comments
COMMENT ON COLUMN epics.epic_type IS 'Type classification of the epic';
COMMENT ON COLUMN epics.portfolio_ask_date IS 'Date when portfolio requested this epic';
COMMENT ON COLUMN epics.initiation_date IS 'Date when epic work officially began';
COMMENT ON COLUMN epics.target_completion_date IS 'Target date for epic completion';
COMMENT ON COLUMN epics.date_locked IS 'Whether dates and estimates are locked';
COMMENT ON COLUMN epics.date_lock_history IS 'History of date lock/unlock events';
COMMENT ON COLUMN epics.capitalized IS 'Whether epic costs are capitalized';
COMMENT ON COLUMN epics.estimation_system IS 'Estimation method: wsjf, tshirt, points, team_weeks, member_weeks';
COMMENT ON COLUMN epics.strategic_value_score IS 'Strategic value score 1-100';
COMMENT ON COLUMN epics.effort_swag IS 'Effort SWAG estimate 1-100';
COMMENT ON COLUMN epics.strategic_driver IS 'Primary strategic driver for this epic';
COMMENT ON COLUMN epics.ability_to_execute IS 'Assessment of ability to execute';
COMMENT ON COLUMN epics.quadrant IS 'Strategic quadrant classification';
COMMENT ON COLUMN epics.investment_type IS 'Type of investment: strategic, regulatory, technical_debt, etc';
COMMENT ON COLUMN epics.customers IS 'Array of customer names or IDs affected';
COMMENT ON COLUMN epics.report_color IS 'Color used in reports and visualizations';

-- Create index on epic_type for filtering
CREATE INDEX IF NOT EXISTS idx_epics_epic_type ON epics(epic_type);
CREATE INDEX IF NOT EXISTS idx_epics_investment_type ON epics(investment_type);
CREATE INDEX IF NOT EXISTS idx_epics_quadrant ON epics(quadrant);