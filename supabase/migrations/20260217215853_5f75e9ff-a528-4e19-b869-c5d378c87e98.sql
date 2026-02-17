
-- Drop any partial leftovers
DROP TABLE IF EXISTS ph_saved_views CASCADE;
DROP TABLE IF EXISTS ph_user_preferences CASCADE;
DROP TABLE IF EXISTS ph_user_favorites CASCADE;
DROP TABLE IF EXISTS ph_initiative_scores CASCADE;
DROP TABLE IF EXISTS ph_initiatives CASCADE;
DROP TABLE IF EXISTS ph_departments CASCADE;
DROP TYPE IF EXISTS initiative_status CASCADE;
DROP FUNCTION IF EXISTS validate_ph_initiative_progress CASCADE;
DROP FUNCTION IF EXISTS validate_ph_score_range CASCADE;
DROP FUNCTION IF EXISTS ph_update_updated_at CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create enum
CREATE TYPE initiative_status AS ENUM (
  'new_demand', 'under_review', 'approved', 'in_progress',
  'on_hold', 'delivered', 'closed', 'cancelled'
);

-- Departments
CREATE TABLE ph_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE
);

ALTER TABLE ph_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON ph_departments FOR SELECT TO authenticated USING (true);

-- Main initiatives table
CREATE TABLE ph_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_key VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status initiative_status NOT NULL DEFAULT 'new_demand',
  assignee_id UUID,
  business_owner_id UUID,
  reporter_id UUID,
  department_id UUID REFERENCES ph_departments(id),
  target_quarter VARCHAR(10),
  business_ask_date DATE,
  kickoff_date DATE,
  target_complete DATE,
  progress INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  risk_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress validation trigger
CREATE OR REPLACE FUNCTION validate_ph_initiative_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_initiative_progress
  BEFORE INSERT OR UPDATE ON ph_initiatives
  FOR EACH ROW EXECUTE FUNCTION validate_ph_initiative_progress();

-- Scores
CREATE TABLE ph_initiative_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE UNIQUE,
  strategic_alignment DECIMAL(2,1),
  business_impact DECIMAL(2,1),
  time_urgency DECIMAL(2,1),
  resource_feasibility DECIMAL(2,1),
  computed_score DECIMAL(2,1) GENERATED ALWAYS AS (
    ROUND((COALESCE(strategic_alignment, 0) + COALESCE(business_impact, 0) +
     COALESCE(time_urgency, 0) + COALESCE(resource_feasibility, 0)) / 4.0, 1)
  ) STORED,
  scored_by UUID,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score range validation trigger
CREATE OR REPLACE FUNCTION validate_ph_score_range()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.strategic_alignment IS NOT NULL AND (NEW.strategic_alignment < 1.0 OR NEW.strategic_alignment > 5.0) THEN
    RAISE EXCEPTION 'strategic_alignment must be between 1.0 and 5.0';
  END IF;
  IF NEW.business_impact IS NOT NULL AND (NEW.business_impact < 1.0 OR NEW.business_impact > 5.0) THEN
    RAISE EXCEPTION 'business_impact must be between 1.0 and 5.0';
  END IF;
  IF NEW.time_urgency IS NOT NULL AND (NEW.time_urgency < 1.0 OR NEW.time_urgency > 5.0) THEN
    RAISE EXCEPTION 'time_urgency must be between 1.0 and 5.0';
  END IF;
  IF NEW.resource_feasibility IS NOT NULL AND (NEW.resource_feasibility < 1.0 OR NEW.resource_feasibility > 5.0) THEN
    RAISE EXCEPTION 'resource_feasibility must be between 1.0 and 5.0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_score_range
  BEFORE INSERT OR UPDATE ON ph_initiative_scores
  FOR EACH ROW EXECUTE FUNCTION validate_ph_score_range();

-- User favorites
CREATE TABLE ph_user_favorites (
  user_id UUID NOT NULL,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, initiative_id)
);

-- User preferences
CREATE TABLE ph_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  view_id VARCHAR(50) DEFAULT 'default',
  column_config JSONB DEFAULT '[]',
  density VARCHAR(20) DEFAULT 'standard',
  default_view VARCHAR(20) DEFAULT 'table',
  page_size INTEGER DEFAULT 50,
  UNIQUE(user_id, view_id)
);

-- Saved views
CREATE TABLE ph_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ph_initiatives_status ON ph_initiatives(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_ph_initiatives_assignee ON ph_initiatives(assignee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_ph_initiatives_quarter ON ph_initiatives(target_quarter) WHERE is_deleted = FALSE;
CREATE INDEX idx_ph_initiatives_sort ON ph_initiatives(sort_order) WHERE is_deleted = FALSE;
CREATE INDEX idx_ph_initiatives_fts ON ph_initiatives USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_ph_initiatives_trgm ON ph_initiatives USING gin(title gin_trgm_ops);
CREATE INDEX idx_ph_scores_initiative ON ph_initiative_scores(initiative_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION ph_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ph_initiatives_updated_at
  BEFORE UPDATE ON ph_initiatives
  FOR EACH ROW EXECUTE FUNCTION ph_update_updated_at();

CREATE TRIGGER set_ph_saved_views_updated_at
  BEFORE UPDATE ON ph_saved_views
  FOR EACH ROW EXECUTE FUNCTION ph_update_updated_at();

-- Enable RLS
ALTER TABLE ph_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_initiative_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "ph_initiatives_all_authenticated" ON ph_initiatives
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ph_scores_all_authenticated" ON ph_initiative_scores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ph_favorites_own" ON ph_user_favorites
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ph_preferences_own" ON ph_user_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ph_saved_views_access" ON ph_saved_views
  FOR ALL TO authenticated USING (user_id = auth.uid() OR is_shared = true) WITH CHECK (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ph_initiatives;
ALTER PUBLICATION supabase_realtime ADD TABLE ph_initiative_scores;

-- Seed departments
INSERT INTO ph_departments (name, code) VALUES
  ('Digital Transformation', 'DT'),
  ('IT Operations', 'ITO'),
  ('Customer Experience', 'CX'),
  ('Data & Analytics', 'DA'),
  ('Human Resources', 'HR'),
  ('Risk & Compliance', 'RC'),
  ('Procurement', 'PROC'),
  ('Operations', 'OPS'),
  ('Cybersecurity', 'SEC');
