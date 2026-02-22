
-- FIX 1: MIM_INITIATIVES TABLE
CREATE TABLE IF NOT EXISTS mim_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new_demand',
  department TEXT,
  assigned_to UUID REFERENCES profiles(id),
  business_owner UUID REFERENCES profiles(id),
  reporter UUID REFERENCES profiles(id),
  target_quarter TEXT,
  kickoff_date DATE,
  target_complete DATE,
  business_ask_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mim_initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "init_select" ON mim_initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "init_insert" ON mim_initiatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "init_update" ON mim_initiatives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "init_delete" ON mim_initiatives FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_mim_init_key ON mim_initiatives(initiative_key);

-- FIX 7: RECREATE VIEW with correct column names
CREATE OR REPLACE VIEW ph_idea_list_view AS
SELECT
  i.*,
  ap.full_name AS assignee_name,
  ap.avatar_url AS assignee_avatar,
  COALESCE(
    SUBSTRING(ap.full_name FROM 1 FOR 1) ||
    SUBSTRING(ap.full_name FROM POSITION(' ' IN COALESCE(ap.full_name, '')) + 1 FOR 1),
    ''
  ) AS assignee_initials,
  cp.full_name AS creator_name,
  init.initiative_key AS initiative_key,
  COALESCE(cc.cnt, 0)::INTEGER AS comment_count,
  COALESCE(ec.cnt, 0)::INTEGER AS evidence_count,
  COALESCE(s.total_score, i.impact_total) AS computed_impact
FROM ph_ideas i
LEFT JOIN profiles ap ON i.assigned_to = ap.id
LEFT JOIN profiles cp ON i.submitted_by = cp.id
LEFT JOIN mim_initiatives init ON i.linked_initiative_id = init.id
LEFT JOIN ph_idea_scores s ON s.idea_id = i.id
LEFT JOIN (SELECT idea_id, COUNT(*) AS cnt FROM ph_idea_comments GROUP BY idea_id) cc ON cc.idea_id = i.id
LEFT JOIN (SELECT idea_id, COUNT(*) AS cnt FROM ph_idea_evidence GROUP BY idea_id) ec ON ec.idea_id = i.id;
