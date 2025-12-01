-- Enable RLS on strategic_goal_key_results
ALTER TABLE strategic_goal_key_results ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view key results
CREATE POLICY "Users can view strategic goal key results"
ON strategic_goal_key_results FOR SELECT
USING (true);

-- Allow authenticated users to manage key results
CREATE POLICY "Users can manage strategic goal key results"
ON strategic_goal_key_results FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);