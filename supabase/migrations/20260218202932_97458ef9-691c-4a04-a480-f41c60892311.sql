
-- ============================================================
-- CATALYST STRATEGY ROOM: DATABASE SCHEMA
-- 14 Tables + 6 Views + Indexes + Triggers
-- All objects prefixed with es_*
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE 1: es_missions
CREATE TABLE IF NOT EXISTS es_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organization_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_missions_org ON es_missions(organization_id);
CREATE INDEX IF NOT EXISTS idx_es_missions_status ON es_missions(status);

-- TABLE 2: es_visions
CREATE TABLE IF NOT EXISTS es_visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES es_missions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_visions_mission ON es_visions(mission_id);

-- TABLE 3: es_strategic_themes
CREATE TABLE IF NOT EXISTS es_strategic_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES es_visions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fiscal_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','draft')),
  color TEXT DEFAULT '#2563EB',
  type TEXT DEFAULT 'strategy' CHECK (type IN ('north_star','long_term','strategy')),
  bsc_perspective TEXT CHECK (bsc_perspective IN ('financial','customer','internal_process','learning_growth', NULL)),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_themes_vision ON es_strategic_themes(vision_id);
CREATE INDEX IF NOT EXISTS idx_es_themes_year ON es_strategic_themes(fiscal_year);

-- TABLE 4: es_goals
CREATE TABLE IF NOT EXISTS es_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES es_strategic_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','at_risk','on_track','achieved','cancelled')),
  progress_pct NUMERIC(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  progress_override BOOLEAN DEFAULT false,
  scope TEXT DEFAULT 'team' CHECK (scope IN ('portfolio','program','team')),
  department_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_goals_theme ON es_goals(theme_id);
CREATE INDEX IF NOT EXISTS idx_es_goals_owner ON es_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_es_goals_status ON es_goals(status);
CREATE INDEX IF NOT EXISTS idx_es_goals_quarter ON es_goals(quarter, year);

-- TABLE 5: es_key_results
CREATE TABLE IF NOT EXISTS es_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES es_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  metric_type TEXT NOT NULL DEFAULT 'percentage' CHECK (metric_type IN ('percentage','number','currency','binary')),
  start_value NUMERIC(15,2) DEFAULT 0,
  target_value NUMERIC(15,2) NOT NULL,
  current_value NUMERIC(15,2) DEFAULT 0,
  unit TEXT DEFAULT '%',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','at_risk','on_track','achieved','cancelled')),
  progress_pct NUMERIC(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('high','medium','low')),
  scoring_method TEXT DEFAULT 'continuous' CHECK (scoring_method IN ('binary','continuous','milestone')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_kr_goal ON es_key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_es_kr_owner ON es_key_results(owner_id);
CREATE INDEX IF NOT EXISTS idx_es_kr_status ON es_key_results(status);

-- TABLE 6: es_initiatives
CREATE TABLE IF NOT EXISTS es_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES es_key_results(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','on_hold','cancelled')),
  progress_pct NUMERIC(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  budget_allocated NUMERIC(15,2) DEFAULT 0,
  budget_spent NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_initiatives_kr ON es_initiatives(key_result_id);
CREATE INDEX IF NOT EXISTS idx_es_initiatives_owner ON es_initiatives(owner_id);
CREATE INDEX IF NOT EXISTS idx_es_initiatives_status ON es_initiatives(status);

-- TABLE 7: es_initiative_epics
CREATE TABLE IF NOT EXISTS es_initiative_epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES es_initiatives(id) ON DELETE CASCADE,
  epic_id UUID,
  planner_task_id UUID,
  link_type TEXT DEFAULT 'epic' CHECK (link_type IN ('epic','planner_task')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT chk_link_target CHECK (epic_id IS NOT NULL OR planner_task_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_es_ie_initiative ON es_initiative_epics(initiative_id);
CREATE INDEX IF NOT EXISTS idx_es_ie_epic ON es_initiative_epics(epic_id);

-- TABLE 8: es_kr_checkins
CREATE TABLE IF NOT EXISTS es_kr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES es_key_results(id) ON DELETE CASCADE,
  value NUMERIC(15,2) NOT NULL,
  previous_value NUMERIC(15,2),
  notes TEXT,
  check_in_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_es_checkins_kr ON es_kr_checkins(key_result_id);
CREATE INDEX IF NOT EXISTS idx_es_checkins_date ON es_kr_checkins(check_in_date DESC);

-- TABLE 9: es_health_scores
CREATE TABLE IF NOT EXISTS es_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  composite_score NUMERIC(5,2) NOT NULL CHECK (composite_score BETWEEN 0 AND 100),
  okr_velocity_score NUMERIC(5,2) DEFAULT 0,
  execution_alignment_score NUMERIC(5,2) DEFAULT 0,
  dependency_resolution_score NUMERIC(5,2) DEFAULT 0,
  checkin_frequency_score NUMERIC(5,2) DEFAULT 0,
  team_alignment_score NUMERIC(5,2) DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  computed_by TEXT DEFAULT 'system',
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_es_health_org ON es_health_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_es_health_date ON es_health_scores(computed_at DESC);

-- TABLE 10: es_ai_recommendations
CREATE TABLE IF NOT EXISTS es_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_score_id UUID REFERENCES es_health_scores(id) ON DELETE CASCADE,
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  category TEXT CHECK (category IN ('okr_velocity','execution_alignment','dependency','checkin','team_alignment','budget','general')),
  linked_entity_type TEXT CHECK (linked_entity_type IN ('goal','key_result','initiative','theme','team')),
  linked_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed')),
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  dismissed_by UUID,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_es_recs_org ON es_ai_recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_es_recs_status ON es_ai_recommendations(status);

-- TABLE 11: es_snapshots
CREATE TABLE IF NOT EXISTS es_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  snapshot_type TEXT DEFAULT 'manual' CHECK (snapshot_type IN ('manual','monthly','quarterly')),
  data_json JSONB NOT NULL,
  health_score NUMERIC(5,2),
  total_goals INTEGER DEFAULT 0,
  total_krs INTEGER DEFAULT 0,
  avg_progress NUMERIC(5,2) DEFAULT 0,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_es_snapshots_org ON es_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_es_snapshots_date ON es_snapshots(snapshot_date DESC);

-- TABLE 12: es_team_alignment
CREATE TABLE IF NOT EXISTS es_team_alignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  workstream TEXT NOT NULL,
  workstream_color TEXT,
  total_items INTEGER DEFAULT 0,
  linked_items INTEGER DEFAULT 0,
  orphaned_items INTEGER DEFAULT 0,
  alignment_score NUMERIC(5,2) DEFAULT 0 CHECK (alignment_score BETWEEN 0 AND 100),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_es_alignment_org ON es_team_alignment(organization_id);
CREATE INDEX IF NOT EXISTS idx_es_alignment_ws ON es_team_alignment(workstream);

-- TABLE 13: es_investment_allocations
CREATE TABLE IF NOT EXISTS es_investment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES es_strategic_themes(id) ON DELETE CASCADE,
  organization_id UUID,
  fiscal_year INTEGER NOT NULL,
  allocated_pct NUMERIC(5,2) DEFAULT 0 CHECK (allocated_pct BETWEEN 0 AND 100),
  allocated_amount NUMERIC(15,2) DEFAULT 0,
  spent_amount NUMERIC(15,2) DEFAULT 0,
  variance_amount NUMERIC(15,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
  status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track','over_budget','under_utilized','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_es_invest_theme ON es_investment_allocations(theme_id);
CREATE INDEX IF NOT EXISTS idx_es_invest_year ON es_investment_allocations(fiscal_year);

-- TABLE 14: es_strategy_roles
CREATE TABLE IF NOT EXISTS es_strategy_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  role TEXT NOT NULL CHECK (role IN ('strategy_owner','contributor','viewer')),
  scope_type TEXT DEFAULT 'organization' CHECK (scope_type IN ('organization','theme','goal')),
  scope_entity_id UUID,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, role, scope_entity_id)
);
CREATE INDEX IF NOT EXISTS idx_es_roles_user ON es_strategy_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_es_roles_org ON es_strategy_roles(organization_id);

-- VIEWS
CREATE OR REPLACE VIEW es_dashboard_pyramid_summary AS
SELECT 'mission' AS layer, 1 AS layer_order, COUNT(*) AS item_count, NULL::NUMERIC AS avg_progress
FROM es_missions WHERE status = 'active'
UNION ALL SELECT 'vision', 2, COUNT(*), NULL FROM es_visions WHERE status = 'active'
UNION ALL SELECT 'theme', 3, COUNT(*), NULL FROM es_strategic_themes WHERE status = 'active'
UNION ALL SELECT 'goal', 4, COUNT(*), ROUND(AVG(progress_pct),1) FROM es_goals WHERE status NOT IN ('cancelled')
UNION ALL SELECT 'key_result', 5, COUNT(*), ROUND(AVG(progress_pct),1) FROM es_key_results WHERE status NOT IN ('cancelled')
UNION ALL SELECT 'initiative', 6, COUNT(*), ROUND(AVG(progress_pct),1) FROM es_initiatives WHERE status NOT IN ('cancelled')
UNION ALL SELECT 'execution_link', 7, COUNT(*), NULL FROM es_initiative_epics
ORDER BY layer_order;

CREATE OR REPLACE VIEW es_dashboard_okr_heatmap AS
SELECT g.id AS goal_id, g.title AS goal_title, g.theme_id, t.title AS theme_title, t.color AS theme_color,
  kr.id AS kr_id, kr.title AS kr_title, kr.progress_pct, kr.status AS kr_status, kr.confidence_level,
  kr.due_date, kr.owner_id, g.quarter, g.year,
  CASE WHEN kr.progress_pct >= 70 THEN 'green' WHEN kr.progress_pct >= 40 THEN 'amber' ELSE 'red' END AS health_color
FROM es_goals g JOIN es_strategic_themes t ON g.theme_id = t.id JOIN es_key_results kr ON kr.goal_id = g.id
WHERE g.status NOT IN ('cancelled') AND kr.status NOT IN ('cancelled')
ORDER BY t.sort_order, g.title, kr.title;

CREATE OR REPLACE VIEW es_dashboard_okr_tree AS
SELECT t.id AS theme_id, t.title AS theme_title, t.color AS theme_color, t.sort_order,
  g.id AS goal_id, g.title AS goal_title, g.status AS goal_status, g.progress_pct AS goal_progress, g.owner_id AS goal_owner,
  kr.id AS kr_id, kr.title AS kr_title, kr.status AS kr_status, kr.progress_pct AS kr_progress, kr.confidence_level, kr.owner_id AS kr_owner,
  i.id AS initiative_id, i.title AS initiative_title, i.status AS initiative_status, i.progress_pct AS initiative_progress,
  ie.id AS link_id, ie.epic_id, ie.planner_task_id, ie.link_type
FROM es_strategic_themes t
LEFT JOIN es_goals g ON g.theme_id = t.id AND g.status != 'cancelled'
LEFT JOIN es_key_results kr ON kr.goal_id = g.id AND kr.status != 'cancelled'
LEFT JOIN es_initiatives i ON i.key_result_id = kr.id AND i.status != 'cancelled'
LEFT JOIN es_initiative_epics ie ON ie.initiative_id = i.id
WHERE t.status = 'active'
ORDER BY t.sort_order, g.title, kr.title, i.title;

CREATE OR REPLACE VIEW es_dashboard_execution_dials AS
SELECT ie.link_type, COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE i.status = 'completed') AS completed_items,
  COUNT(*) FILTER (WHERE i.status = 'in_progress') AS in_progress_items,
  COUNT(*) FILTER (WHERE i.status IN ('planned','on_hold')) AS not_started_items,
  ROUND((COUNT(*) FILTER (WHERE i.status = 'completed'))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS completion_pct
FROM es_initiative_epics ie JOIN es_initiatives i ON ie.initiative_id = i.id
GROUP BY ie.link_type;

CREATE OR REPLACE VIEW es_dashboard_health_composite AS
SELECT hs.id, hs.composite_score, hs.okr_velocity_score, hs.execution_alignment_score,
  hs.dependency_resolution_score, hs.checkin_frequency_score, hs.team_alignment_score,
  hs.computed_at, hs.period_start, hs.period_end,
  CASE WHEN hs.composite_score >= 80 THEN 'excellent' WHEN hs.composite_score >= 60 THEN 'good'
    WHEN hs.composite_score >= 40 THEN 'needs_attention' ELSE 'critical' END AS health_status,
  (SELECT json_agg(json_build_object('id', r.id, 'title', r.title, 'description', r.description,
    'priority', r.priority, 'category', r.category, 'status', r.status,
    'linked_entity_type', r.linked_entity_type, 'linked_entity_id', r.linked_entity_id))
   FROM es_ai_recommendations r WHERE r.health_score_id = hs.id AND r.status = 'pending') AS pending_recommendations
FROM es_health_scores hs ORDER BY hs.computed_at DESC LIMIT 1;

CREATE OR REPLACE VIEW es_dashboard_team_alignment AS
SELECT workstream, workstream_color, total_items, linked_items, orphaned_items, alignment_score,
  CASE WHEN alignment_score >= 80 THEN 'excellent' WHEN alignment_score >= 60 THEN 'good'
    WHEN alignment_score >= 40 THEN 'needs_attention' ELSE 'critical' END AS alignment_status,
  computed_at
FROM es_team_alignment ORDER BY alignment_score DESC;

-- TRIGGERS
CREATE OR REPLACE FUNCTION es_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'es_missions','es_visions','es_strategic_themes','es_goals',
    'es_key_results','es_initiatives','es_investment_allocations'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION es_update_updated_at()', tbl, tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION es_calculate_kr_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE es_key_results SET
    current_value = NEW.value,
    progress_pct = LEAST(100, GREATEST(0,
      CASE WHEN target_value = start_value THEN 0
      ELSE ROUND(((NEW.value - start_value) / NULLIF(target_value - start_value, 0)) * 100, 2) END
    )),
    status = CASE
      WHEN ROUND(((NEW.value - start_value) / NULLIF(target_value - start_value, 0)) * 100, 2) >= 100 THEN 'achieved'
      WHEN ROUND(((NEW.value - start_value) / NULLIF(target_value - start_value, 0)) * 100, 2) >= 70 THEN 'on_track'
      WHEN ROUND(((NEW.value - start_value) / NULLIF(target_value - start_value, 0)) * 100, 2) >= 40 THEN 'in_progress'
      ELSE 'at_risk' END,
    updated_at = now()
  WHERE id = NEW.key_result_id;

  UPDATE es_goals SET
    progress_pct = (SELECT ROUND(AVG(progress_pct), 2) FROM es_key_results WHERE goal_id = (
      SELECT goal_id FROM es_key_results WHERE id = NEW.key_result_id
    ) AND status != 'cancelled'),
    updated_at = now()
  WHERE id = (SELECT goal_id FROM es_key_results WHERE id = NEW.key_result_id)
    AND progress_override = false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kr_checkin_progress ON es_kr_checkins;
CREATE TRIGGER trg_kr_checkin_progress
AFTER INSERT ON es_kr_checkins
FOR EACH ROW EXECUTE FUNCTION es_calculate_kr_progress();

-- RLS
ALTER TABLE es_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_initiative_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_kr_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_team_alignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_investment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_strategy_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to all es_* tables
CREATE POLICY "Authenticated users can read es_missions" ON es_missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_missions" ON es_missions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_missions" ON es_missions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_missions" ON es_missions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_visions" ON es_visions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_visions" ON es_visions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_visions" ON es_visions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_visions" ON es_visions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_strategic_themes" ON es_strategic_themes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_strategic_themes" ON es_strategic_themes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_strategic_themes" ON es_strategic_themes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_strategic_themes" ON es_strategic_themes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_goals" ON es_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_goals" ON es_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_goals" ON es_goals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_goals" ON es_goals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_key_results" ON es_key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_key_results" ON es_key_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_key_results" ON es_key_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_key_results" ON es_key_results FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_initiatives" ON es_initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_initiatives" ON es_initiatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_initiatives" ON es_initiatives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_initiatives" ON es_initiatives FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_initiative_epics" ON es_initiative_epics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_initiative_epics" ON es_initiative_epics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_initiative_epics" ON es_initiative_epics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_initiative_epics" ON es_initiative_epics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_kr_checkins" ON es_kr_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_kr_checkins" ON es_kr_checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_kr_checkins" ON es_kr_checkins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_kr_checkins" ON es_kr_checkins FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_health_scores" ON es_health_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_health_scores" ON es_health_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_health_scores" ON es_health_scores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_health_scores" ON es_health_scores FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_ai_recommendations" ON es_ai_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_ai_recommendations" ON es_ai_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_ai_recommendations" ON es_ai_recommendations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_ai_recommendations" ON es_ai_recommendations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_snapshots" ON es_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_snapshots" ON es_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_snapshots" ON es_snapshots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_snapshots" ON es_snapshots FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_team_alignment" ON es_team_alignment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_team_alignment" ON es_team_alignment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_team_alignment" ON es_team_alignment FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_team_alignment" ON es_team_alignment FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_investment_allocations" ON es_investment_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_investment_allocations" ON es_investment_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_investment_allocations" ON es_investment_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_investment_allocations" ON es_investment_allocations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read es_strategy_roles" ON es_strategy_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert es_strategy_roles" ON es_strategy_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update es_strategy_roles" ON es_strategy_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete es_strategy_roles" ON es_strategy_roles FOR DELETE TO authenticated USING (true);
