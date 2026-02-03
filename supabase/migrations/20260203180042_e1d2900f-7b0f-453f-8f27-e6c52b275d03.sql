-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK¹⁰ DATABASE SCHEMA — COMPLETE IMPLEMENTATION
-- Module: Task¹⁰ Priority Management
-- Version: 3.0 (Complete Rebuild)
-- Date: February 2026
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: DROP EXISTING OBJECTS (Clean Slate)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS t10_items_full CASCADE;
DROP VIEW IF EXISTS t10_list_summary CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS t10_item_labels CASCADE;
DROP TABLE IF EXISTS t10_labels CASCADE;
DROP TABLE IF EXISTS t10_items CASCADE;
DROP TABLE IF EXISTS t10_weeks CASCADE;
DROP TABLE IF EXISTS t10_lists CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: CREATE CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- -----------------------------------------------------------------------------
-- TABLE: t10_lists
-- -----------------------------------------------------------------------------
CREATE TABLE t10_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_t10_lists_status ON t10_lists(status);
CREATE INDEX idx_t10_lists_created_by ON t10_lists(created_by);
CREATE INDEX idx_t10_lists_created_at ON t10_lists(created_at DESC);

COMMENT ON TABLE t10_lists IS 'Task¹⁰ lists - containers for weekly priority tracking';

-- -----------------------------------------------------------------------------
-- TABLE: t10_weeks
-- -----------------------------------------------------------------------------
CREATE TABLE t10_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES t10_lists(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  is_current BOOLEAN DEFAULT false,
  completed_count INTEGER DEFAULT 0 CHECK (completed_count >= 0),
  total_count INTEGER DEFAULT 0 CHECK (total_count >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, week_start)
);

CREATE INDEX idx_t10_weeks_list_id ON t10_weeks(list_id);
CREATE INDEX idx_t10_weeks_is_current ON t10_weeks(is_current) WHERE is_current = true;
CREATE INDEX idx_t10_weeks_week_start ON t10_weeks(week_start DESC);

COMMENT ON TABLE t10_weeks IS 'Task¹⁰ weeks - weekly snapshots of priorities within a list';

-- -----------------------------------------------------------------------------
-- TABLE: t10_items
-- -----------------------------------------------------------------------------
CREATE TABLE t10_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES t10_weeks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  taskhub_key VARCHAR(20),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  carryover_count INTEGER DEFAULT 0 CHECK (carryover_count >= 0),
  is_buffer BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_t10_items_week_id ON t10_items(week_id);
CREATE INDEX idx_t10_items_assignee ON t10_items(assignee_id);
CREATE INDEX idx_t10_items_status ON t10_items(status);
CREATE INDEX idx_t10_items_due_date ON t10_items(due_date);
CREATE INDEX idx_t10_items_rank ON t10_items(week_id, rank);
CREATE INDEX idx_t10_items_is_buffer ON t10_items(is_buffer) WHERE is_buffer = true;
CREATE INDEX idx_t10_items_title_search ON t10_items USING gin(to_tsvector('english', title));

COMMENT ON TABLE t10_items IS 'Task¹⁰ items - individual priority items ranked 1-10 (or buffer 11+)';

-- -----------------------------------------------------------------------------
-- TABLE: t10_labels
-- -----------------------------------------------------------------------------
CREATE TABLE t10_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_t10_labels_name ON t10_labels(name);

COMMENT ON TABLE t10_labels IS 'Task¹⁰ labels - reusable tags for categorizing priority items';

-- -----------------------------------------------------------------------------
-- TABLE: t10_item_labels (Junction)
-- -----------------------------------------------------------------------------
CREATE TABLE t10_item_labels (
  item_id UUID NOT NULL REFERENCES t10_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES t10_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (item_id, label_id)
);

CREATE INDEX idx_t10_item_labels_item ON t10_item_labels(item_id);
CREATE INDEX idx_t10_item_labels_label ON t10_item_labels(label_id);

COMMENT ON TABLE t10_item_labels IS 'Task¹⁰ item-label junction - links items to their labels';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: CREATE VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE VIEW t10_list_summary AS
SELECT 
  l.id,
  l.key,
  l.name,
  l.description,
  l.status,
  l.created_by,
  l.created_at,
  l.updated_at,
  p.full_name AS creator_name,
  p.avatar_url AS creator_avatar,
  cw.id AS current_week_id,
  cw.week_start,
  cw.week_end,
  cw.status AS week_status,
  COALESCE(cw.completed_count, 0) AS completed_count,
  COALESCE(cw.total_count, 0) AS total_count,
  (SELECT COUNT(*) FROM t10_weeks WHERE list_id = l.id) AS total_weeks
FROM t10_lists l
LEFT JOIN profiles p ON l.created_by = p.id
LEFT JOIN t10_weeks cw ON cw.list_id = l.id AND cw.is_current = true;

COMMENT ON VIEW t10_list_summary IS 'Task¹⁰ list summary - for landing page cards with current week stats';

CREATE VIEW t10_items_full AS
SELECT 
  i.id,
  i.week_id,
  i.rank,
  i.title,
  i.description,
  i.taskhub_key,
  i.assignee_id,
  i.due_date,
  i.status,
  i.carryover_count,
  i.is_buffer,
  i.created_by,
  i.created_at,
  i.updated_at,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', lb.id,
          'name', lb.name,
          'color', lb.color
        )
        ORDER BY lb.name
      )
      FROM t10_item_labels il
      JOIN t10_labels lb ON il.label_id = lb.id
      WHERE il.item_id = i.id
    ),
    '[]'::json
  ) AS labels
FROM t10_items i
LEFT JOIN profiles p ON i.assignee_id = p.id;

COMMENT ON VIEW t10_items_full IS 'Task¹⁰ items full - items with assignee details and labels array';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE t10_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE t10_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE t10_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE t10_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE t10_item_labels ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: CREATE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- t10_lists policies
CREATE POLICY "t10_lists_select_all" ON t10_lists FOR SELECT USING (true);
CREATE POLICY "t10_lists_insert_auth" ON t10_lists FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "t10_lists_update_owner" ON t10_lists FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "t10_lists_delete_owner" ON t10_lists FOR DELETE USING (auth.uid() = created_by);

-- t10_weeks policies
CREATE POLICY "t10_weeks_select_all" ON t10_weeks FOR SELECT USING (true);
CREATE POLICY "t10_weeks_insert_owner" ON t10_weeks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM t10_lists WHERE id = list_id AND created_by = auth.uid()));
CREATE POLICY "t10_weeks_update_owner" ON t10_weeks FOR UPDATE USING (EXISTS (SELECT 1 FROM t10_lists WHERE id = list_id AND created_by = auth.uid()));
CREATE POLICY "t10_weeks_delete_owner" ON t10_weeks FOR DELETE USING (EXISTS (SELECT 1 FROM t10_lists WHERE id = list_id AND created_by = auth.uid()));

-- t10_items policies
CREATE POLICY "t10_items_select_all" ON t10_items FOR SELECT USING (true);
CREATE POLICY "t10_items_insert_owner" ON t10_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM t10_weeks w JOIN t10_lists l ON w.list_id = l.id WHERE w.id = week_id AND l.created_by = auth.uid()));
CREATE POLICY "t10_items_update_owner" ON t10_items FOR UPDATE USING (EXISTS (SELECT 1 FROM t10_weeks w JOIN t10_lists l ON w.list_id = l.id WHERE w.id = week_id AND l.created_by = auth.uid()));
CREATE POLICY "t10_items_delete_owner" ON t10_items FOR DELETE USING (EXISTS (SELECT 1 FROM t10_weeks w JOIN t10_lists l ON w.list_id = l.id WHERE w.id = week_id AND l.created_by = auth.uid()));

-- t10_labels policies
CREATE POLICY "t10_labels_select_all" ON t10_labels FOR SELECT USING (true);
CREATE POLICY "t10_labels_insert_auth" ON t10_labels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "t10_labels_update_owner" ON t10_labels FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "t10_labels_delete_owner" ON t10_labels FOR DELETE USING (auth.uid() = created_by);

-- t10_item_labels policies
CREATE POLICY "t10_item_labels_select_all" ON t10_item_labels FOR SELECT USING (true);
CREATE POLICY "t10_item_labels_insert_owner" ON t10_item_labels FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM t10_items i JOIN t10_weeks w ON i.week_id = w.id JOIN t10_lists l ON w.list_id = l.id WHERE i.id = item_id AND l.created_by = auth.uid()));
CREATE POLICY "t10_item_labels_delete_owner" ON t10_item_labels FOR DELETE USING (EXISTS (SELECT 1 FROM t10_items i JOIN t10_weeks w ON i.week_id = w.id JOIN t10_lists l ON w.list_id = l.id WHERE i.id = item_id AND l.created_by = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: CREATE HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_t10_key()
RETURNS VARCHAR(10) AS $$
DECLARE
  next_num INTEGER;
  new_key VARCHAR(10);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM t10_lists
  WHERE key ~ '^T10-[0-9]+$';
  
  new_key := 'T10-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_key;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_t10_key() IS 'Generates next sequential T10-XXX key';

CREATE OR REPLACE FUNCTION update_t10_week_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE t10_weeks
  SET 
    total_count = (SELECT COUNT(*) FROM t10_items WHERE week_id = COALESCE(NEW.week_id, OLD.week_id) AND is_buffer = false),
    completed_count = (SELECT COUNT(*) FROM t10_items WHERE week_id = COALESCE(NEW.week_id, OLD.week_id) AND is_buffer = false AND status = 'done'),
    updated_at = now()
  WHERE id = COALESCE(NEW.week_id, OLD.week_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_week_counts ON t10_items;
CREATE TRIGGER trigger_update_week_counts
  AFTER INSERT OR UPDATE OR DELETE ON t10_items
  FOR EACH ROW
  EXECUTE FUNCTION update_t10_week_counts();

CREATE OR REPLACE FUNCTION update_t10_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_t10_lists_updated ON t10_lists;
CREATE TRIGGER trigger_t10_lists_updated
  BEFORE UPDATE ON t10_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_t10_updated_at();

DROP TRIGGER IF EXISTS trigger_t10_weeks_updated ON t10_weeks;
CREATE TRIGGER trigger_t10_weeks_updated
  BEFORE UPDATE ON t10_weeks
  FOR EACH ROW
  EXECUTE FUNCTION update_t10_updated_at();

DROP TRIGGER IF EXISTS trigger_t10_items_updated ON t10_items;
CREATE TRIGGER trigger_t10_items_updated
  BEFORE UPDATE ON t10_items
  FOR EACH ROW
  EXECUTE FUNCTION update_t10_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: SEED DEFAULT LABELS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO t10_labels (name, color, description) VALUES
  ('Critical', '#dc2626', 'Highest priority - immediate attention required'),
  ('High', '#f97316', 'High priority - complete this week'),
  ('Medium', '#eab308', 'Medium priority - important but not urgent'),
  ('Low', '#22c55e', 'Low priority - nice to have'),
  ('Bug Fix', '#ef4444', 'Software bug that needs fixing'),
  ('Feature', '#8b5cf6', 'New feature development'),
  ('Documentation', '#06b6d4', 'Documentation updates'),
  ('Testing', '#f59e0b', 'Testing and QA tasks'),
  ('Security', '#dc2626', 'Security-related tasks'),
  ('Code Review', '#10b981', 'Code review required'),
  ('Blocked', '#ef4444', 'Blocked by external dependency'),
  ('Needs Review', '#8b5cf6', 'Ready for review')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8: GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON t10_list_summary TO authenticated;
GRANT SELECT ON t10_items_full TO authenticated;
GRANT EXECUTE ON FUNCTION generate_t10_key() TO authenticated;