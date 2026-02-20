
-- ============================================================================
-- IDEATION IMPACT SCORING — Combined Migration
-- ============================================================================

-- PRE-FLIGHT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ph_ideas') THEN
    RAISE EXCEPTION 'ph_ideas table does not exist.';
  END IF;
END $$;

-- 1. ALTER ph_ideas — Add IMPACT scoring columns
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS imperative NUMERIC(2,1) DEFAULT 0 CHECK (imperative >= 0 AND imperative <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS ministry_efficiency NUMERIC(2,1) DEFAULT 0 CHECK (ministry_efficiency >= 0 AND ministry_efficiency <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS pain_severity NUMERIC(2,1) DEFAULT 0 CHECK (pain_severity >= 0 AND pain_severity <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS alignment NUMERIC(2,1) DEFAULT 0 CHECK (alignment >= 0 AND alignment <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS complexity_score NUMERIC(2,1) DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS timeframe_score NUMERIC(2,1) DEFAULT 0 CHECK (timeframe_score >= 0 AND timeframe_score <= 5);
ALTER TABLE ph_ideas ADD COLUMN IF NOT EXISTS impact_total NUMERIC(3,2) DEFAULT 0;

-- 2. TRIGGER
CREATE OR REPLACE FUNCTION calculate_impact_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (NEW.imperative + NEW.ministry_efficiency + NEW.pain_severity + NEW.alignment + NEW.complexity_score + NEW.timeframe_score) > 0 THEN
    NEW.impact_total := ROUND(
      (NEW.imperative * 0.25) + (NEW.ministry_efficiency * 0.20) + (NEW.pain_severity * 0.20) +
      (NEW.alignment * 0.15) + (NEW.complexity_score * 0.10) + (NEW.timeframe_score * 0.10), 2);
  ELSE NEW.impact_total := 0;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_calculate_impact_total ON ph_ideas;
CREATE TRIGGER trg_calculate_impact_total
  BEFORE INSERT OR UPDATE OF imperative, ministry_efficiency, pain_severity, alignment, complexity_score, timeframe_score
  ON ph_ideas FOR EACH ROW EXECUTE FUNCTION calculate_impact_total();

-- 3. ph_idea_v2030_mappings
CREATE TABLE IF NOT EXISTS ph_idea_v2030_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('vibrant_society', 'thriving_economy', 'ambitious_nation')),
  relevance_score NUMERIC(2,1) DEFAULT 3.0 CHECK (relevance_score >= 1 AND relevance_score <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(idea_id, pillar)
);
CREATE INDEX IF NOT EXISTS idx_v2030_idea ON ph_idea_v2030_mappings(idea_id);
ALTER TABLE ph_idea_v2030_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_v2030_select" ON ph_idea_v2030_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_v2030_insert" ON ph_idea_v2030_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ph_v2030_update" ON ph_idea_v2030_mappings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ph_v2030_delete" ON ph_idea_v2030_mappings FOR DELETE TO authenticated USING (true);

-- 4. ph_idea_compliance_tags
CREATE TABLE IF NOT EXISTS ph_idea_compliance_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  standard TEXT NOT NULL CHECK (standard IN ('DGA', 'NCA', 'NDMO', 'SDAIA')),
  requirement_id TEXT,
  is_ai_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_unique ON ph_idea_compliance_tags(idea_id, standard, COALESCE(requirement_id, ''));
CREATE INDEX IF NOT EXISTS idx_compliance_idea ON ph_idea_compliance_tags(idea_id);
ALTER TABLE ph_idea_compliance_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_compliance_select" ON ph_idea_compliance_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_compliance_insert" ON ph_idea_compliance_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ph_compliance_update" ON ph_idea_compliance_tags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ph_compliance_delete" ON ph_idea_compliance_tags FOR DELETE TO authenticated USING (true);

-- 5. Indexes on ph_ideas
CREATE INDEX IF NOT EXISTS idx_ideas_impact_total ON ph_ideas(impact_total DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ideas_imperative ON ph_ideas(imperative DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ideas_complexity ON ph_ideas(complexity_score) WHERE is_deleted = FALSE;

-- 6. ALTER ph_idea_scores
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS imperative NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS ministry_efficiency NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS pain_severity NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS alignment_score NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS complexity_factor NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores ADD COLUMN IF NOT EXISTS timeframe_factor NUMERIC(2,1) DEFAULT 0;
ALTER TABLE ph_idea_scores DROP CONSTRAINT IF EXISTS ph_idea_scores_framework_check;
ALTER TABLE ph_idea_scores ADD CONSTRAINT ph_idea_scores_framework_check CHECK (framework IN ('RICE', 'WSJF', 'IMPACT', 'Custom'));

-- 7. Drop and recreate views
DROP VIEW IF EXISTS ph_ideas_impact_distribution CASCADE;
DROP VIEW IF EXISTS ph_ideas_top_contributors CASCADE;
DROP VIEW IF EXISTS ph_ideas_monthly_trend CASCADE;
DROP VIEW IF EXISTS ph_ideas_dept_counts CASCADE;
DROP VIEW IF EXISTS ph_ideas_status_counts CASCADE;
DROP VIEW IF EXISTS ph_ideas_triage CASCADE;
DROP VIEW IF EXISTS ph_ideas_matrix CASCADE;
DROP VIEW IF EXISTS ph_ideas_board CASCADE;
DROP VIEW IF EXISTS ph_ideas_listing CASCADE;

CREATE VIEW ph_ideas_listing AS
SELECT i.*,
  sp.raw_user_meta_data->>'full_name' AS submitted_by_name,
  ap.raw_user_meta_data->>'full_name' AS assigned_to_name,
  (SELECT COUNT(*) FROM ph_idea_comments c WHERE c.idea_id = i.id) AS comment_count,
  (SELECT COUNT(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count,
  (SELECT COUNT(*) FROM ph_ideas child WHERE child.parent_idea_id = i.id AND child.is_deleted = FALSE) AS child_count,
  (SELECT COUNT(*) FROM ph_idea_v2030_mappings v WHERE v.idea_id = i.id) AS v2030_pillar_count,
  (SELECT COUNT(*) FROM ph_idea_compliance_tags ct WHERE ct.idea_id = i.id) AS compliance_tag_count,
  li.title AS linked_initiative_title,
  li.initiative_key AS linked_initiative_key
FROM ph_ideas i
LEFT JOIN auth.users sp ON sp.id = i.submitted_by
LEFT JOIN auth.users ap ON ap.id = i.assigned_to
LEFT JOIN ph_initiatives li ON li.id = i.linked_initiative_id
WHERE i.is_deleted = FALSE;

CREATE VIEW ph_ideas_board AS
SELECT i.id, i.idea_key, i.title, i.description, i.idea_type, i.status, i.priority,
  i.category, i.department, i.impact_total, i.imperative, i.rice_score, i.wsjf_score,
  i.vote_count, i.vote_score, i.assigned_to,
  ap.raw_user_meta_data->>'full_name' AS assigned_to_name,
  i.ai_enrichment_status, i.tags, i.created_at, i.updated_at
FROM ph_ideas i LEFT JOIN auth.users ap ON ap.id = i.assigned_to WHERE i.is_deleted = FALSE;

CREATE VIEW ph_ideas_matrix AS
SELECT i.id, i.idea_key, i.title, i.idea_type, i.status, i.priority, i.category, i.department,
  i.imperative, i.ministry_efficiency, i.pain_severity, i.alignment,
  i.complexity_score, i.timeframe_score, i.impact_total,
  i.complexity_score AS matrix_x,
  ROUND((i.imperative * 0.30) + (i.ministry_efficiency * 0.25) + (i.pain_severity * 0.25) + (i.alignment * 0.20), 2) AS matrix_y,
  i.vote_count, i.vote_score
FROM ph_ideas i WHERE i.is_deleted = FALSE AND i.status NOT IN ('Draft', 'Archived', 'Rejected') AND i.impact_total > 0;

CREATE VIEW ph_ideas_triage AS
SELECT i.id, i.idea_key, i.title, i.idea_type, i.source, i.priority, i.department,
  i.impact_total, i.submitted_by,
  sp.raw_user_meta_data->>'full_name' AS submitted_by_name,
  i.ai_category, i.ai_duplicate_ids, i.ai_summary, i.ai_enrichment_status, i.created_at,
  (SELECT COUNT(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count
FROM ph_ideas i LEFT JOIN auth.users sp ON sp.id = i.submitted_by
WHERE i.status = 'Submitted' AND i.is_deleted = FALSE
ORDER BY i.impact_total DESC NULLS LAST,
  CASE i.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 END,
  i.created_at ASC;

CREATE VIEW ph_ideas_status_counts AS
SELECT status, COUNT(*) AS idea_count, ROUND(AVG(impact_total), 2) AS avg_impact, SUM(vote_count) AS total_votes
FROM ph_ideas WHERE is_deleted = FALSE GROUP BY status;

CREATE VIEW ph_ideas_dept_counts AS
SELECT COALESCE(department, 'Unassigned') AS department, COUNT(*) AS idea_count,
  ROUND(AVG(impact_total), 2) AS avg_impact,
  COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Converted') AS approved_count
FROM ph_ideas WHERE is_deleted = FALSE GROUP BY department ORDER BY idea_count DESC;

CREATE VIEW ph_ideas_monthly_trend AS
SELECT DATE_TRUNC('month', created_at)::DATE AS month, COUNT(*) AS submitted,
  COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Converted') AS approved,
  COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
  ROUND(AVG(impact_total), 2) AS avg_impact
FROM ph_ideas WHERE is_deleted = FALSE GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC LIMIT 12;

CREATE VIEW ph_ideas_top_contributors AS
SELECT submitted_by, sp.raw_user_meta_data->>'full_name' AS contributor_name,
  COUNT(*) AS ideas_submitted,
  COUNT(*) FILTER (WHERE i.status = 'Approved' OR i.status = 'Converted') AS ideas_approved,
  ROUND(AVG(i.impact_total), 2) AS avg_impact
FROM ph_ideas i LEFT JOIN auth.users sp ON sp.id = i.submitted_by
WHERE i.is_deleted = FALSE AND i.submitted_by IS NOT NULL
GROUP BY i.submitted_by, sp.raw_user_meta_data->>'full_name' ORDER BY ideas_submitted DESC LIMIT 10;

CREATE VIEW ph_ideas_impact_distribution AS
SELECT
  CASE WHEN impact_total >= 4.0 THEN 'Excellent (4.0-5.0)' WHEN impact_total >= 3.0 THEN 'Good (3.0-3.99)'
    WHEN impact_total >= 2.0 THEN 'Fair (2.0-2.99)' WHEN impact_total > 0 THEN 'Low (0.01-1.99)' ELSE 'Unscored' END AS score_band,
  COUNT(*) AS idea_count,
  CASE WHEN impact_total >= 4.0 THEN 1 WHEN impact_total >= 3.0 THEN 2 WHEN impact_total >= 2.0 THEN 3 WHEN impact_total > 0 THEN 4 ELSE 5 END AS sort_order
FROM ph_ideas WHERE is_deleted = FALSE GROUP BY 1, 3 ORDER BY sort_order;

-- 8. REALTIME
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ph_idea_v2030_mappings;
    ALTER PUBLICATION supabase_realtime ADD TABLE ph_idea_compliance_tags;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
