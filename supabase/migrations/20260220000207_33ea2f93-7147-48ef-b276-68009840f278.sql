
-- ============================================================
-- GATE 2: Goals & Key Results Module — Schema Extensions
-- Adapted to existing es_goals, es_key_results, es_kr_checkins
-- ============================================================

-- ============ 1.1 EXTEND es_goals ============

ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS goal_key TEXT UNIQUE;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS score_override NUMERIC(3,2);
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS fiscal_quarter TEXT;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS bsc_perspective TEXT;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS kr_count INTEGER DEFAULT 0;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS check_in_count INTEGER DEFAULT 0;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS last_check_in_at TIMESTAMPTZ;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS ai_health_score INTEGER;
ALTER TABLE es_goals ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(3,2) DEFAULT 0.5;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_es_goals_theme ON es_goals(theme_id);
CREATE INDEX IF NOT EXISTS idx_es_goals_owner ON es_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_es_goals_status ON es_goals(status);
CREATE INDEX IF NOT EXISTS idx_es_goals_goal_key ON es_goals(goal_key);
CREATE INDEX IF NOT EXISTS idx_es_goals_archived ON es_goals(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_es_goals_quarter ON es_goals(fiscal_quarter);

-- Auto-generate goal_key trigger
CREATE OR REPLACE FUNCTION fn_goal_auto_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(goal_key FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM es_goals
  WHERE goal_key IS NOT NULL AND goal_key ~ '^G-[0-9]+$';
  
  NEW.goal_key := 'G-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goal_auto_key ON es_goals;
CREATE TRIGGER trg_goal_auto_key
  BEFORE INSERT ON es_goals
  FOR EACH ROW
  WHEN (NEW.goal_key IS NULL)
  EXECUTE FUNCTION fn_goal_auto_key();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION fn_es_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_es_goals_updated ON es_goals;
CREATE TRIGGER trg_es_goals_updated
  BEFORE UPDATE ON es_goals
  FOR EACH ROW
  EXECUTE FUNCTION fn_es_update_timestamp();

-- ============ 1.2 EXTEND es_key_results ============
-- Existing cols: confidence_level, created_at, created_by, current_value, description,
--   due_date, goal_id, id, metric_type, owner_id, progress_pct, scoring_method,
--   start_value (=baseline), status, target_value (=target), title, unit (=metric_unit),
--   updated_at, updated_by

ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS kr_key TEXT UNIQUE;
ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS check_in_count INTEGER DEFAULT 0;
ALTER TABLE es_key_results ADD COLUMN IF NOT EXISTS last_check_in_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_es_kr_goal ON es_key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_es_kr_owner ON es_key_results(owner_id);
CREATE INDEX IF NOT EXISTS idx_es_kr_status ON es_key_results(status);
CREATE INDEX IF NOT EXISTS idx_es_kr_kr_key ON es_key_results(kr_key);

-- Auto-generate kr_key trigger
CREATE OR REPLACE FUNCTION fn_kr_auto_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(kr_key FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM es_key_results
  WHERE kr_key IS NOT NULL AND kr_key ~ '^KR-[0-9]+$';
  
  NEW.kr_key := 'KR-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kr_auto_key ON es_key_results;
CREATE TRIGGER trg_kr_auto_key
  BEFORE INSERT ON es_key_results
  FOR EACH ROW
  WHEN (NEW.kr_key IS NULL)
  EXECUTE FUNCTION fn_kr_auto_key();

DROP TRIGGER IF EXISTS trg_es_kr_updated ON es_key_results;
CREATE TRIGGER trg_es_kr_updated
  BEFORE UPDATE ON es_key_results
  FOR EACH ROW
  EXECUTE FUNCTION fn_es_update_timestamp();

-- ============ 1.3 EXTEND es_kr_checkins ============
-- Existing cols: author_id (=checked_by), check_in_date, created_at, id,
--   key_result_id, notes (=note), previous_value, value (=new_value)

ALTER TABLE es_kr_checkins ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(3,2);

CREATE INDEX IF NOT EXISTS idx_es_checkins_kr ON es_kr_checkins(key_result_id);
CREATE INDEX IF NOT EXISTS idx_es_checkins_date ON es_kr_checkins(created_at DESC);

-- After check-in trigger: update KR current_value + goal counters
-- Uses EXISTING column names: value, author_id, notes
CREATE OR REPLACE FUNCTION fn_after_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE es_key_results SET
    current_value = NEW.value,
    check_in_count = COALESCE(check_in_count, 0) + 1,
    last_check_in_at = COALESCE(NEW.created_at, now()),
    confidence_level = COALESCE(NEW.confidence_level::text, confidence_level),
    updated_at = now()
  WHERE id = NEW.key_result_id;
  
  UPDATE es_goals SET
    check_in_count = COALESCE(check_in_count, 0) + 1,
    last_check_in_at = COALESCE(NEW.created_at, now()),
    updated_at = now()
  WHERE id = (SELECT goal_id FROM es_key_results WHERE id = NEW.key_result_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_checkin ON es_kr_checkins;
CREATE TRIGGER trg_after_checkin
  AFTER INSERT ON es_kr_checkins
  FOR EACH ROW
  EXECUTE FUNCTION fn_after_checkin();

-- ============ 1.4 NEW TABLE: es_goal_dependencies ============

CREATE TABLE IF NOT EXISTS es_goal_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_goal_id UUID NOT NULL REFERENCES es_goals(id) ON DELETE CASCADE,
  target_goal_id UUID NOT NULL REFERENCES es_goals(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'depends_on' CHECK (dependency_type IN ('depends_on','blocks','related')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT no_self_dependency CHECK (source_goal_id != target_goal_id),
  CONSTRAINT unique_dependency UNIQUE (source_goal_id, target_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_es_dep_source ON es_goal_dependencies(source_goal_id);
CREATE INDEX IF NOT EXISTS idx_es_dep_target ON es_goal_dependencies(target_goal_id);

ALTER TABLE es_goal_dependencies ENABLE ROW LEVEL SECURITY;

-- ============ 2. RLS POLICIES ============

-- es_goals (drop existing if any, then create)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Goals viewable by authenticated users" ON es_goals;
  DROP POLICY IF EXISTS "Goals insertable by authenticated users" ON es_goals;
  DROP POLICY IF EXISTS "Goals updatable by authenticated users" ON es_goals;
  DROP POLICY IF EXISTS "Goals deletable by authenticated users" ON es_goals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE es_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Goals viewable by authenticated users"
  ON es_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Goals insertable by authenticated users"
  ON es_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Goals updatable by authenticated users"
  ON es_goals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Goals deletable by authenticated users"
  ON es_goals FOR DELETE TO authenticated USING (true);

-- es_key_results
DO $$ BEGIN
  DROP POLICY IF EXISTS "KRs viewable by authenticated users" ON es_key_results;
  DROP POLICY IF EXISTS "KRs insertable by authenticated users" ON es_key_results;
  DROP POLICY IF EXISTS "KRs updatable by authenticated users" ON es_key_results;
  DROP POLICY IF EXISTS "KRs deletable by authenticated users" ON es_key_results;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE es_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KRs viewable by authenticated users"
  ON es_key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "KRs insertable by authenticated users"
  ON es_key_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "KRs updatable by authenticated users"
  ON es_key_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "KRs deletable by authenticated users"
  ON es_key_results FOR DELETE TO authenticated USING (true);

-- es_kr_checkins
DO $$ BEGIN
  DROP POLICY IF EXISTS "Checkins viewable by authenticated" ON es_kr_checkins;
  DROP POLICY IF EXISTS "Checkins insertable by authenticated" ON es_kr_checkins;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE es_kr_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkins viewable by authenticated"
  ON es_kr_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Checkins insertable by authenticated"
  ON es_kr_checkins FOR INSERT TO authenticated WITH CHECK (true);

-- es_goal_dependencies
CREATE POLICY "Dependencies viewable by authenticated"
  ON es_goal_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dependencies insertable by authenticated"
  ON es_goal_dependencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Dependencies deletable by authenticated"
  ON es_goal_dependencies FOR DELETE TO authenticated USING (true);

-- ============ 3. AGGREGATION VIEW ============
-- Uses actual column names: start_value, target_value, unit

CREATE OR REPLACE VIEW es_goals_tree_view WITH (security_invoker = on) AS
SELECT
  g.id,
  g.goal_key,
  g.title,
  g.description,
  g.status,
  g.priority,
  g.progress_pct,
  g.confidence_level,
  g.weight,
  g.score_override,
  g.fiscal_quarter,
  g.bsc_perspective,
  g.start_date,
  g.target_date,
  g.sort_order,
  g.is_archived,
  g.tags,
  g.ai_health_score,
  g.created_at,
  g.updated_at,
  g.theme_id,
  t.title AS theme_title,
  t.color AS theme_color,
  t.status AS theme_status,
  g.owner_id,
  p.full_name AS owner_name,
  p.avatar_url AS owner_avatar,
  COALESCE(kr_agg.kr_count, 0) AS kr_count,
  COALESCE(kr_agg.kr_completed, 0) AS kr_completed,
  COALESCE(kr_agg.avg_kr_progress, 0) AS avg_kr_progress,
  COALESCE(kr_agg.weighted_kr_progress, 0) AS weighted_kr_progress,
  COALESCE(kr_agg.kr_on_track, 0) AS kr_on_track,
  COALESCE(kr_agg.kr_at_risk, 0) AS kr_at_risk,
  COALESCE(kr_agg.kr_off_track, 0) AS kr_off_track,
  COALESCE(kr_agg.kr_overdue, 0) AS kr_overdue,
  g.check_in_count,
  g.last_check_in_at,
  COALESCE(dep.dep_count, 0) AS dependency_count
FROM es_goals g
LEFT JOIN es_strategic_themes t ON g.theme_id = t.id
LEFT JOIN profiles p ON g.owner_id = p.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS kr_count,
    COUNT(*) FILTER (WHERE kr.status = 'completed') AS kr_completed,
    ROUND(AVG(kr.progress_pct), 1) AS avg_kr_progress,
    CASE 
      WHEN SUM(COALESCE(kr.weight, 1)) > 0 THEN ROUND(SUM(COALESCE(kr.progress_pct,0) * COALESCE(kr.weight,1)) / SUM(COALESCE(kr.weight,1)), 1)
      ELSE 0
    END AS weighted_kr_progress,
    COUNT(*) FILTER (WHERE kr.status = 'on_track') AS kr_on_track,
    COUNT(*) FILTER (WHERE kr.status = 'at_risk') AS kr_at_risk,
    COUNT(*) FILTER (WHERE kr.status = 'off_track') AS kr_off_track,
    COUNT(*) FILTER (WHERE kr.due_date < CURRENT_DATE AND kr.status != 'completed') AS kr_overdue
  FROM es_key_results kr
  WHERE kr.goal_id = g.id
) kr_agg ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS dep_count
  FROM es_goal_dependencies d
  WHERE d.source_goal_id = g.id OR d.target_goal_id = g.id
) dep ON true
WHERE g.is_archived = false;

-- ============ 4. GOAL PROGRESS RECOMPUTATION ============

CREATE OR REPLACE FUNCTION fn_recompute_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_progress NUMERIC;
  v_kr_count INTEGER;
BEGIN
  v_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);
  
  SELECT
    CASE 
      WHEN SUM(COALESCE(weight,1)) > 0 THEN ROUND(SUM(COALESCE(progress_pct,0) * COALESCE(weight,1)) / SUM(COALESCE(weight,1)), 1)
      ELSE 0
    END,
    COUNT(*)
  INTO v_progress, v_kr_count
  FROM es_key_results
  WHERE goal_id = v_goal_id;
  
  UPDATE es_goals SET
    progress_pct = CASE WHEN score_override IS NOT NULL THEN score_override * 100 ELSE v_progress END,
    kr_count = v_kr_count,
    updated_at = now()
  WHERE id = v_goal_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kr_recompute_goal ON es_key_results;
CREATE TRIGGER trg_kr_recompute_goal
  AFTER INSERT OR UPDATE OF current_value, weight, status OR DELETE
  ON es_key_results
  FOR EACH ROW
  EXECUTE FUNCTION fn_recompute_goal_progress();
