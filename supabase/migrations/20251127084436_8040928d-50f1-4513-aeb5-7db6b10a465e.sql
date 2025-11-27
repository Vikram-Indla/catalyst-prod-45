-- ============================================
-- PHASE 3: EPIC DETAIL PANEL DATABASE SCHEMA
-- ============================================

-- ============================================
-- WSJF PRIORITIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS epic_wsjf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
  pi_id UUID REFERENCES program_increments(id) ON DELETE CASCADE,
  
  -- WSJF Components (Fibonacci: 0,1,2,3,5,8,13,20,40,100)
  business_value INTEGER CHECK (business_value IN (0,1,2,3,5,8,13,20,40,100)),
  time_value INTEGER CHECK (time_value IN (0,1,2,3,5,8,13,20,40,100)),
  rroe_value INTEGER CHECK (rroe_value IN (0,1,2,3,5,8,13,20,40,100)),
  job_size INTEGER CHECK (job_size IN (0,1,2,3,5,8,13,20,40,100)),
  
  -- Calculated WSJF Score
  wsjf_score DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE 
      WHEN job_size > 0 AND business_value IS NOT NULL AND time_value IS NOT NULL AND rroe_value IS NOT NULL
      THEN (business_value + time_value + rroe_value)::DECIMAL / job_size
      ELSE NULL
    END
  ) STORED,
  
  global_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(epic_id, pi_id)
);

-- Enable RLS
ALTER TABLE epic_wsjf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WSJF scores"
  ON epic_wsjf FOR SELECT
  USING (true);

CREATE POLICY "Users can manage WSJF scores"
  ON epic_wsjf FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- VALUE TAB - SCORECARDS
-- ============================================

CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  portfolio_id UUID REFERENCES portfolios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecard_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID REFERENCES scorecards(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  max_points INTEGER NOT NULL DEFAULT 100,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecard_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES scorecard_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epic_scorecard_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
  question_id UUID REFERENCES scorecard_questions(id) ON DELETE CASCADE,
  selected_answer_id UUID REFERENCES scorecard_answers(id),
  score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(epic_id, question_id)
);

-- High Level ROI (simplified scorecard)
CREATE TABLE IF NOT EXISTS epic_roi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID REFERENCES epics(id) ON DELETE CASCADE UNIQUE,
  
  -- ROI Fields (Low=100, Medium=66, High=33 for costs; inverse for benefits)
  cost_score INTEGER CHECK (cost_score IN (0, 33, 66, 100)),
  profit_potential_score INTEGER CHECK (profit_potential_score IN (0, 33, 66, 100)),
  time_to_market_score INTEGER CHECK (time_to_market_score IN (0, 33, 66, 100)),
  development_risks_score INTEGER CHECK (development_risks_score IN (0, 33, 66, 100)),
  
  -- Calculated Value Score (average of above)
  value_score DECIMAL(5,2) GENERATED ALWAYS AS (
    (COALESCE(cost_score, 0) + COALESCE(profit_potential_score, 0) + 
     COALESCE(time_to_market_score, 0) + COALESCE(development_risks_score, 0))::DECIMAL / 4
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE epic_scorecard_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE epic_roi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scorecards" ON scorecards FOR SELECT USING (true);
CREATE POLICY "Users can view scorecard questions" ON scorecard_questions FOR SELECT USING (true);
CREATE POLICY "Users can view scorecard answers" ON scorecard_answers FOR SELECT USING (true);
CREATE POLICY "Users can manage scorecard responses" ON epic_scorecard_responses FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage ROI scores" ON epic_roi_scores FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- SPEND TAB - FINANCIAL
-- ============================================

CREATE TABLE IF NOT EXISTS epic_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID REFERENCES epics(id) ON DELETE CASCADE UNIQUE,
  
  budget DECIMAL(15,2) DEFAULT 0,
  
  -- Calculated totals (updated via triggers/functions)
  forecasted_spend DECIMAL(15,2) DEFAULT 0,
  estimated_spend DECIMAL(15,2) DEFAULT 0,
  accepted_spend DECIMAL(15,2) DEFAULT 0,
  
  -- Spend Risk
  business_impact TEXT,
  risk_appetite TEXT,
  it_risk TEXT,
  failure_impact TEXT,
  failure_probability TEXT,
  
  -- Other Financial
  discount_rate DECIMAL(5,2),
  initial_investment DECIMAL(15,2),
  efficiency_dividend DECIMAL(15,2),
  revenue_assurance DECIMAL(15,2),
  return_on_investment DECIMAL(15,2),
  work_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE epic_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view epic spend"
  ON epic_spend FOR SELECT
  USING (true);

CREATE POLICY "Users can manage epic spend"
  ON epic_spend FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- MILESTONES
-- ============================================

CREATE TABLE IF NOT EXISTS milestone_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portfolio_id UUID REFERENCES portfolios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to milestones table if they don't exist
ALTER TABLE milestones 
  ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES milestone_categories(id),
  ADD COLUMN IF NOT EXISTS completed_date DATE;

-- Enable RLS
ALTER TABLE milestone_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestone categories"
  ON milestone_categories FOR SELECT
  USING (true);

CREATE POLICY "Users can manage milestone categories"
  ON milestone_categories FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- INTAKE TAB
-- ============================================

CREATE TABLE IF NOT EXISTS intake_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portfolio_id UUID REFERENCES portfolios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_set_id UUID REFERENCES intake_sets(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  position INTEGER NOT NULL,
  options TEXT[],
  max_length INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epic_intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
  field_id UUID REFERENCES intake_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(epic_id, field_id)
);

-- Enable RLS
ALTER TABLE intake_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE epic_intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intake sets" ON intake_sets FOR SELECT USING (true);
CREATE POLICY "Users can view intake fields" ON intake_fields FOR SELECT USING (true);
CREATE POLICY "Users can manage intake responses" ON epic_intake_responses FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update Feature progress from Stories (if not exists)
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_progress_trigger ON stories;
CREATE TRIGGER feature_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON stories
FOR EACH ROW
EXECUTE FUNCTION update_feature_progress();