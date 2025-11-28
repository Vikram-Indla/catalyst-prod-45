-- Add RLS policies for new Program Board tables

-- Enable RLS on new tables
ALTER TABLE feature_scheduling_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_team_rankings ENABLE ROW LEVEL SECURITY;

-- Feature Scheduling History policies
CREATE POLICY "Users can view feature scheduling history"
  ON feature_scheduling_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert feature scheduling history"
  ON feature_scheduling_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Program Team Rankings policies
CREATE POLICY "Users can view program team rankings"
  ON program_team_rankings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage program team rankings"
  ON program_team_rankings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);