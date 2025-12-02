-- =====================================================
-- CATALYST OBJECTIVES MODULE - DATABASE MIGRATION v2
-- Comprehensive schema per technical specification
-- Fixed: Removed solution references (Catalyst uses Portfolio → Program → Team)
-- =====================================================

-- Step 1: Create Enums
DO $$ BEGIN
  CREATE TYPE objective_tier AS ENUM ('portfolio', 'program', 'team');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_status AS ENUM (
    'pending', 
    'in_progress', 
    'on_track', 
    'at_risk', 
    'off_track', 
    'paused', 
    'completed', 
    'canceled', 
    'missed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_health AS ENUM ('good', 'fair', 'poor', 'at_risk');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_category AS ENUM ('critical_path', 'stretch_goal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_type AS ENUM (
    'feature_finisher', 
    'non_code', 
    'incremental_delivery', 
    'event'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE metric_type AS ENUM (
    'count', 
    'currency', 
    'percentage', 
    'decimal_score', 
    'nps'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE work_item_type_enum AS ENUM ('epic', 'feature', 'story', 'task', 'defect');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE alignment_type AS ENUM ('direct', 'inherited');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 2: Update existing objectives table columns
ALTER TABLE IF EXISTS objectives 
  DROP COLUMN IF EXISTS category CASCADE,
  DROP COLUMN IF EXISTS type CASCADE,
  DROP COLUMN IF EXISTS health CASCADE,
  DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE IF EXISTS objectives
  ADD COLUMN IF NOT EXISTS category objective_category,
  ADD COLUMN IF NOT EXISTS type objective_type,
  ADD COLUMN IF NOT EXISTS health objective_health,
  ADD COLUMN IF NOT EXISTS status objective_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS planned_value INTEGER CHECK (planned_value >= 0 AND planned_value <= 100),
  ADD COLUMN IF NOT EXISTS delivered_value INTEGER CHECK (delivered_value >= 0 AND delivered_value <= 100),
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS anchor_sprint_id UUID;

-- Step 3: Create proper key_results table
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary VARCHAR(500) NOT NULL,
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  metric_type metric_type NOT NULL,
  baseline_value DECIMAL(20,4),
  current_value DECIMAL(20,4),
  goal_value DECIMAL(20,4) NOT NULL,
  owner_user_id UUID,
  rank INTEGER DEFAULT 0,
  score_override DECIMAL(3,2) CHECK (score_override >= 0 AND score_override <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID
);

-- Step 4: Create key result check-ins table
CREATE TABLE IF NOT EXISTS key_result_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE NOT NULL,
  value DECIMAL(20,4) NOT NULL,
  note_richtext TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create objective contributors table
CREATE TABLE IF NOT EXISTS objective_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(objective_id, user_id)
);

-- Step 6: Create objective program increments junction table
CREATE TABLE IF NOT EXISTS objective_program_increments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  program_increment_id UUID REFERENCES program_increments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(objective_id, program_increment_id)
);

-- Step 7: Create objective work item alignments table
CREATE TABLE IF NOT EXISTS objective_work_item_alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  work_item_id UUID NOT NULL,
  work_item_type work_item_type_enum NOT NULL,
  alignment_type alignment_type DEFAULT 'direct',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID,
  UNIQUE(objective_id, work_item_id, work_item_type)
);

-- Step 8: Create objective linked items (external URLs)
CREATE TABLE IF NOT EXISTS objective_linked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE NOT NULL,
  link_name VARCHAR(255) NOT NULL,
  link_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID
);

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_objectives_tier ON objectives(tier);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_portfolio ON objectives(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_objectives_program ON objectives(program_id);
CREATE INDEX IF NOT EXISTS idx_objectives_team ON objectives(team_id);
CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_objectives_blocked ON objectives(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_checkins_key_result ON key_result_checkins(key_result_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON key_result_checkins(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_alignments_objective ON objective_work_item_alignments(objective_id);
CREATE INDEX IF NOT EXISTS idx_alignments_work_item ON objective_work_item_alignments(work_item_id, work_item_type);

-- Step 10: Create database function for score calculation
CREATE OR REPLACE FUNCTION calculate_objective_score(objective_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_score DECIMAL;
  kr_count INTEGER;
  has_scored BOOLEAN;
  override_score DECIMAL;
BEGIN
  SELECT score_override INTO override_score FROM objectives WHERE id = objective_uuid;
  IF override_score IS NOT NULL THEN RETURN override_score; END IF;
  
  SELECT 
    SUM(CASE 
      WHEN goal_value != COALESCE(baseline_value, 0) AND current_value IS NOT NULL THEN
        GREATEST(0, LEAST(1, 
          (current_value - COALESCE(baseline_value, 0)) / 
          NULLIF(goal_value - COALESCE(baseline_value, 0), 0)
        ))
      ELSE 0
    END),
    COUNT(*),
    BOOL_OR(current_value IS NOT NULL)
  INTO total_score, kr_count, has_scored
  FROM key_results WHERE objective_id = objective_uuid;
  
  IF kr_count = 0 OR NOT has_scored THEN RETURN NULL; END IF;
  RETURN ROUND(total_score / kr_count, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_objective_timestamp()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS objectives_updated_trigger ON objectives;
CREATE TRIGGER objectives_updated_trigger 
BEFORE UPDATE ON objectives
FOR EACH ROW EXECUTE FUNCTION update_objective_timestamp();

DROP TRIGGER IF EXISTS key_results_updated_trigger ON key_results;
CREATE TRIGGER key_results_updated_trigger 
BEFORE UPDATE ON key_results
FOR EACH ROW EXECUTE FUNCTION update_objective_timestamp();

-- Step 12: Create trigger to update KR current value on check-in
CREATE OR REPLACE FUNCTION update_kr_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE key_results 
  SET current_value = NEW.value, updated_at = NOW()
  WHERE id = NEW.key_result_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kr_checkin_update_trigger ON key_result_checkins;
CREATE TRIGGER kr_checkin_update_trigger 
AFTER INSERT ON key_result_checkins
FOR EACH ROW EXECUTE FUNCTION update_kr_on_checkin();

-- Step 13: Enable RLS on all tables
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_result_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_program_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_work_item_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_linked_items ENABLE ROW LEVEL SECURITY;

-- Step 14: Create RLS policies
DROP POLICY IF EXISTS "Users can read all objectives" ON objectives;
CREATE POLICY "Users can read all objectives" ON objectives FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create objectives" ON objectives;
CREATE POLICY "Users can create objectives" ON objectives FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update objectives" ON objectives;
CREATE POLICY "Users can update objectives" ON objectives FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete objectives" ON objectives;
CREATE POLICY "Users can delete objectives" ON objectives FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can read key_results" ON key_results;
CREATE POLICY "Users can read key_results" ON key_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can modify key_results" ON key_results;
CREATE POLICY "Users can modify key_results" ON key_results FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can read checkins" ON key_result_checkins;
CREATE POLICY "Users can read checkins" ON key_result_checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can modify checkins" ON key_result_checkins;
CREATE POLICY "Users can modify checkins" ON key_result_checkins FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage contributors" ON objective_contributors;
CREATE POLICY "Users can manage contributors" ON objective_contributors FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage pi links" ON objective_program_increments;
CREATE POLICY "Users can manage pi links" ON objective_program_increments FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage alignments" ON objective_work_item_alignments;
CREATE POLICY "Users can manage alignments" ON objective_work_item_alignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage links" ON objective_linked_items;
CREATE POLICY "Users can manage links" ON objective_linked_items FOR ALL USING (true);