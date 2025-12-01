-- Prioritization & Estimation Module: Database Schema Enhancements
-- Phase 1: WSJF for Features + Estimation Conversions

-- Add WSJF fields to features table (if not already present)
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS business_value integer,
ADD COLUMN IF NOT EXISTS time_criticality integer,
ADD COLUMN IF NOT EXISTS risk_reduction integer,
ADD COLUMN IF NOT EXISTS job_size integer,
ADD COLUMN IF NOT EXISTS wsjf_score decimal;

-- Create estimation_conversions table for T-shirt sizing conversions
CREATE TABLE IF NOT EXISTS estimation_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_type text NOT NULL CHECK (work_item_type IN ('epic', 'feature')),
  tshirt_size text NOT NULL,
  member_weeks decimal NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(work_item_type, tshirt_size)
);

ALTER TABLE estimation_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estimation conversions" ON estimation_conversions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage estimation conversions" ON estimation_conversions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Seed default T-shirt sizing conversions (1 MW = 5 story points per Jira Align)
INSERT INTO estimation_conversions (work_item_type, tshirt_size, member_weeks, sort_order) VALUES
  ('epic', 'X-Small', 6, 1),
  ('epic', 'Small', 18, 2),
  ('epic', 'Medium', 60, 3),
  ('epic', 'Large', 120, 4),
  ('epic', 'X-Large', 240, 5),
  ('feature', 'X-Small', 6, 1),
  ('feature', 'Small', 18, 2),
  ('feature', 'Medium', 60, 3),
  ('feature', 'Large', 120, 4),
  ('feature', 'X-Large', 240, 5)
ON CONFLICT (work_item_type, tshirt_size) DO NOTHING;

-- Create portfolio_estimation_settings table
CREATE TABLE IF NOT EXISTS portfolio_estimation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE UNIQUE,
  estimation_system text NOT NULL DEFAULT 'points' CHECK (estimation_system IN ('tshirt', 'points', 'weeks')),
  display_weeks_in text DEFAULT 'member_weeks' CHECK (display_weeks_in IN ('member_weeks', 'team_weeks')),
  member_weeks_per_point decimal DEFAULT 0.2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_estimation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio estimation settings" ON portfolio_estimation_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage portfolio estimation settings" ON portfolio_estimation_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create team_point_systems table
CREATE TABLE IF NOT EXISTS team_point_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  point_system text NOT NULL DEFAULT 'fibonacci' CHECK (point_system IN ('fibonacci', 'power_of_2')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_point_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team point systems" ON team_point_systems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage team point systems" ON team_point_systems FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'team_lead'))
);

-- Create program_spend_per_point table for financial calculations
CREATE TABLE IF NOT EXISTS program_spend_per_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  sprint_start_date date NOT NULL,
  sprint_end_date date NOT NULL,
  spend_per_point decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, sprint_start_date, sprint_end_date)
);

ALTER TABLE program_spend_per_point ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view program spend per point" ON program_spend_per_point FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage program spend per point" ON program_spend_per_point FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'program_manager'))
);

-- Create team_spend_per_sprint table for sprint-based calculations
CREATE TABLE IF NOT EXISTS team_spend_per_sprint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES iterations(id) ON DELETE CASCADE,
  team_spend decimal NOT NULL,
  points_accepted integer NOT NULL DEFAULT 0,
  spend_per_point decimal GENERATED ALWAYS AS (
    CASE WHEN points_accepted > 0 THEN team_spend / points_accepted ELSE 0 END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, sprint_id)
);

ALTER TABLE team_spend_per_sprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team spend per sprint" ON team_spend_per_sprint FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage team spend per sprint" ON team_spend_per_sprint FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'team_lead'))
);

-- Add updated_at triggers
CREATE TRIGGER update_estimation_conversions_updated_at BEFORE UPDATE ON estimation_conversions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_estimation_settings_updated_at BEFORE UPDATE ON portfolio_estimation_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_point_systems_updated_at BEFORE UPDATE ON team_point_systems 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_program_spend_per_point_updated_at BEFORE UPDATE ON program_spend_per_point 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_spend_per_sprint_updated_at BEFORE UPDATE ON team_spend_per_sprint 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();