
-- Fix 5: Create es_goal_initiatives join table
CREATE TABLE IF NOT EXISTS es_goal_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES es_goals(id) ON DELETE CASCADE,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by UUID,
  notes TEXT,
  CONSTRAINT unique_goal_initiative UNIQUE (goal_id, initiative_id)
);

CREATE INDEX idx_egi_goal ON es_goal_initiatives(goal_id);
CREATE INDEX idx_egi_initiative ON es_goal_initiatives(initiative_id);

ALTER TABLE es_goal_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Goal initiatives viewable by authenticated" ON es_goal_initiatives 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Goal initiatives manageable by authenticated" ON es_goal_initiatives 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Goal initiatives deletable by authenticated" ON es_goal_initiatives 
  FOR DELETE TO authenticated USING (true);
