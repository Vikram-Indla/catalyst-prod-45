
-- ═══════════════════════════════════════════════════════════
-- STEP 1A: Create KR → ph_initiatives junction table
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS es_kr_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES es_key_results(id) ON DELETE CASCADE,
  initiative_id UUID NOT NULL REFERENCES ph_initiatives(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by UUID,
  notes TEXT,
  CONSTRAINT unique_kr_initiative UNIQUE (key_result_id, initiative_id)
);
CREATE INDEX IF NOT EXISTS idx_ekri_kr ON es_kr_initiatives(key_result_id);
CREATE INDEX IF NOT EXISTS idx_ekri_initiative ON es_kr_initiatives(initiative_id);
ALTER TABLE es_kr_initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KR initiatives viewable" ON es_kr_initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "KR initiatives manageable" ON es_kr_initiatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "KR initiatives updatable" ON es_kr_initiatives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "KR initiatives deletable" ON es_kr_initiatives FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Create alignment map view
-- Adapts to actual column names in the database
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW vw_alignment_map WITH (security_invoker = on) AS
SELECT
  -- Theme layer
  t.id AS theme_id,
  'ST-' || LPAD(t.sort_order::text, 3, '0') AS theme_key,
  t.title AS theme_name,
  t.color AS theme_color,
  t.status AS theme_status,
  COALESCE(t.progress_pct, 0) AS theme_progress,

  -- Goal layer
  g.id AS goal_id,
  g.goal_key,
  g.title AS goal_title,
  g.status AS goal_status,
  COALESCE(g.progress_pct, 0) AS goal_progress,
  g.ai_health_score AS goal_health,

  -- KR layer
  kr.id AS kr_id,
  kr.kr_key,
  kr.title AS kr_title,
  kr.status AS kr_status,
  COALESCE(kr.progress_pct, 0) AS kr_progress,

  -- Initiative layer (via kr_initiatives junction)
  ini.id AS initiative_id,
  ini.initiative_key,
  ini.title AS initiative_title,
  ini.status AS initiative_status,
  COALESCE(ini.progress, 0) AS initiative_progress,

  -- Epic layer (via initiative_epics junction → epics table)
  e.id AS epic_id,
  e.epic_key AS epic_key,
  e.name AS epic_title,
  e.status AS epic_status

FROM es_strategic_themes t
LEFT JOIN es_goals g ON g.theme_id = t.id
LEFT JOIN es_key_results kr ON kr.goal_id = g.id
LEFT JOIN es_kr_initiatives ekri ON ekri.key_result_id = kr.id
LEFT JOIN ph_initiatives ini ON ini.id = ekri.initiative_id
LEFT JOIN es_initiative_epics eie ON eie.initiative_id = ini.id::text::uuid
LEFT JOIN epics e ON e.id = eie.epic_id
ORDER BY t.sort_order, g.goal_key, kr.kr_key;
