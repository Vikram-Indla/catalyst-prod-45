-- ═══════════════════════════════════════════════════════════════════════════════
-- AQD¹⁰ COMPLETE SCHEMA - STEP 1: DROP LEFTOVERS + CREATE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop leftover functions first
DROP FUNCTION IF EXISTS aqd_get_or_create_current_week(uuid) CASCADE;
DROP FUNCTION IF EXISTS aqd_cycle_item_status(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS aqd_reorder_items(uuid, uuid, int) CASCADE;
DROP FUNCTION IF EXISTS aqd_checkout_week(uuid, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS aqd_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS aqd_record_history() CASCADE;

-- TABLE 1: aqd_lists
CREATE TABLE aqd_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{"max_items": 10, "overflow_max": 10, "auto_checkout": false, "week_start_day": 1, "notify_carryover": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_aqd_lists_created_by ON aqd_lists(created_by);
CREATE INDEX idx_aqd_lists_archived ON aqd_lists(is_archived) WHERE is_archived = false;

-- TABLE 2: aqd_weeks
CREATE TABLE aqd_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES aqd_lists(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'checkout_pending', 'archived')),
  performance_summary JSONB DEFAULT '{"resolved": 0, "carried": 0, "unresolved": 0, "completion_rate": 0}'::jsonb,
  checkout_notes TEXT,
  checked_out_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT aqd_weeks_unique UNIQUE(list_id, week_number, year),
  CONSTRAINT aqd_weeks_dates CHECK (end_date >= start_date)
);
CREATE INDEX idx_aqd_weeks_list ON aqd_weeks(list_id);
CREATE INDEX idx_aqd_weeks_status ON aqd_weeks(status);

-- TABLE 3: aqd_labels
CREATE TABLE aqd_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES aqd_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT aqd_labels_unique UNIQUE(list_id, name)
);
CREATE INDEX idx_aqd_labels_list ON aqd_labels(list_id);

-- TABLE 4: aqd_items
CREATE TABLE aqd_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES aqd_lists(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES aqd_weeks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 20),
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
  description TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  taskhub_key TEXT CHECK (taskhub_key IS NULL OR taskhub_key ~ '^[A-Z]{2,5}-[0-9]+$'),
  due_date DATE,
  is_carryover BOOLEAN DEFAULT false,
  carryover_from_week_id UUID REFERENCES aqd_weeks(id) ON DELETE SET NULL,
  carryover_count INTEGER DEFAULT 0 CHECK (carryover_count >= 0),
  carryover_confirmed BOOLEAN DEFAULT false,
  checkout_decision TEXT CHECK (checkout_decision IS NULL OR checkout_decision IN ('resolved', 'carry', 'leave')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT aqd_items_rank_unique UNIQUE(week_id, rank)
);
CREATE INDEX idx_aqd_items_week ON aqd_items(week_id);
CREATE INDEX idx_aqd_items_rank ON aqd_items(week_id, rank);
CREATE INDEX idx_aqd_items_status ON aqd_items(status);

-- TABLE 5: aqd_item_labels
CREATE TABLE aqd_item_labels (
  item_id UUID NOT NULL REFERENCES aqd_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES aqd_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (item_id, label_id)
);
CREATE INDEX idx_aqd_item_labels_item ON aqd_item_labels(item_id);

-- TABLE 6: aqd_item_notes
CREATE TABLE aqd_item_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES aqd_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_aqd_item_notes_item ON aqd_item_notes(item_id);

-- TABLE 7: aqd_item_history
CREATE TABLE aqd_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES aqd_items(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_aqd_item_history_item ON aqd_item_history(item_id);

-- RLS POLICIES
ALTER TABLE aqd_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aqd_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aqd_lists_select" ON aqd_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "aqd_lists_insert" ON aqd_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "aqd_lists_update" ON aqd_lists FOR UPDATE TO authenticated USING (true);
CREATE POLICY "aqd_lists_delete" ON aqd_lists FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "aqd_weeks_all" ON aqd_weeks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aqd_labels_all" ON aqd_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aqd_items_all" ON aqd_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aqd_item_labels_all" ON aqd_item_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aqd_item_notes_all" ON aqd_item_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aqd_item_history_all" ON aqd_item_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- VIEWS
CREATE VIEW aqd_items_full AS
SELECT 
  i.id, i.list_id, i.week_id, i.rank, i.title, i.description, i.status,
  i.assignee_id, i.taskhub_key, i.due_date, i.is_carryover, i.carryover_from_week_id,
  i.carryover_count, i.carryover_confirmed, i.checkout_decision,
  i.created_by, i.created_at, i.updated_at,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  cp.full_name AS created_by_name,
  COALESCE(
    (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color, 'sort_order', l.sort_order, 'list_id', l.list_id, 'created_at', l.created_at) ORDER BY l.sort_order, l.name)
     FROM aqd_item_labels il JOIN aqd_labels l ON il.label_id = l.id WHERE il.item_id = i.id),
    '[]'::json
  ) AS labels,
  (SELECT COUNT(*)::int FROM aqd_item_notes n WHERE n.item_id = i.id) AS note_count
FROM aqd_items i
LEFT JOIN profiles p ON i.assignee_id = p.id
LEFT JOIN profiles cp ON i.created_by = cp.id;

CREATE VIEW aqd_lists_full AS
SELECT 
  l.id, l.name, l.description, l.created_by, l.is_archived, l.is_pinned,
  l.settings, l.created_at, l.updated_at,
  p.full_name AS owner_name,
  p.avatar_url AS owner_avatar,
  (SELECT json_build_object('id', w.id, 'week_number', w.week_number, 'year', w.year,
      'start_date', w.start_date, 'end_date', w.end_date, 'status', w.status)
   FROM aqd_weeks w WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.year DESC, w.week_number DESC LIMIT 1) AS current_week,
  (SELECT COUNT(*)::int FROM aqd_items i JOIN aqd_weeks w ON i.week_id = w.id
   WHERE w.list_id = l.id AND w.status = 'active') AS active_item_count,
  (SELECT COUNT(*)::int FROM aqd_items i JOIN aqd_weeks w ON i.week_id = w.id
   WHERE w.list_id = l.id AND w.status = 'active' AND i.status = 'completed') AS completed_item_count
FROM aqd_lists l
LEFT JOIN profiles p ON l.created_by = p.id;

CREATE VIEW aqd_weeks_full AS
SELECT 
  w.id, w.list_id, w.week_number, w.year, w.start_date, w.end_date,
  w.status, w.performance_summary, w.checkout_notes, w.checked_out_by,
  w.checked_out_at, w.created_at, w.updated_at,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id) AS total_items,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id AND i.status = 'completed') AS completed_items,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id AND i.status = 'in_progress') AS in_progress_items,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id AND i.status = 'not_started') AS not_started_items,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id AND i.is_carryover = true) AS carryover_items,
  (SELECT COUNT(*)::int FROM aqd_items i WHERE i.week_id = w.id AND i.is_carryover = true AND i.carryover_confirmed = false) AS pending_carryover_items
FROM aqd_weeks w;

-- FUNCTIONS
CREATE FUNCTION aqd_get_or_create_current_week(p_list_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_week_id UUID; v_week_number INT; v_year INT; v_start_date DATE; v_end_date DATE;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_week_number := EXTRACT(WEEK FROM CURRENT_DATE)::INT;
  v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_end_date := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '4 days')::DATE;
  SELECT id INTO v_week_id FROM aqd_weeks WHERE list_id = p_list_id AND week_number = v_week_number AND year = v_year AND status = 'active';
  IF v_week_id IS NULL THEN
    INSERT INTO aqd_weeks (list_id, week_number, year, start_date, end_date, status)
    VALUES (p_list_id, v_week_number, v_year, v_start_date, v_end_date, 'active') RETURNING id INTO v_week_id;
  END IF;
  RETURN v_week_id;
END; $$;

CREATE FUNCTION aqd_cycle_item_status(p_item_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_status TEXT; v_new_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM aqd_items WHERE id = p_item_id;
  IF v_current_status IS NULL THEN RAISE EXCEPTION 'Item not found: %', p_item_id; END IF;
  v_new_status := CASE v_current_status WHEN 'not_started' THEN 'in_progress' WHEN 'in_progress' THEN 'completed' WHEN 'completed' THEN 'not_started' END;
  UPDATE aqd_items SET status = v_new_status, updated_at = now() WHERE id = p_item_id;
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by) VALUES (p_item_id, 'status', v_current_status, v_new_status, p_user_id);
  RETURN v_new_status;
END; $$;

CREATE FUNCTION aqd_reorder_items(p_week_id UUID, p_item_id UUID, p_new_rank INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old_rank INT;
BEGIN
  SELECT rank INTO v_old_rank FROM aqd_items WHERE id = p_item_id;
  IF v_old_rank IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF v_old_rank = p_new_rank THEN RETURN; END IF;
  UPDATE aqd_items SET rank = 0 WHERE id = p_item_id;
  IF p_new_rank < v_old_rank THEN
    UPDATE aqd_items SET rank = rank + 1, updated_at = now() WHERE week_id = p_week_id AND rank >= p_new_rank AND rank < v_old_rank AND id != p_item_id;
  ELSE
    UPDATE aqd_items SET rank = rank - 1, updated_at = now() WHERE week_id = p_week_id AND rank > v_old_rank AND rank <= p_new_rank AND id != p_item_id;
  END IF;
  UPDATE aqd_items SET rank = p_new_rank, updated_at = now() WHERE id = p_item_id;
END; $$;

CREATE FUNCTION aqd_checkout_week(p_week_id UUID, p_user_id UUID, p_decisions JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_decision JSONB; v_resolved INT := 0; v_carried INT := 0; v_unresolved INT := 0; v_list_id UUID; v_new_week_id UUID;
BEGIN
  SELECT list_id INTO v_list_id FROM aqd_weeks WHERE id = p_week_id;
  IF v_list_id IS NULL THEN RAISE EXCEPTION 'Week not found: %', p_week_id; END IF;
  FOR v_decision IN SELECT * FROM jsonb_array_elements(p_decisions) LOOP
    UPDATE aqd_items SET checkout_decision = v_decision->>'decision', updated_at = now() WHERE id = (v_decision->>'item_id')::UUID;
    CASE v_decision->>'decision' WHEN 'resolved' THEN v_resolved := v_resolved + 1; WHEN 'carry' THEN v_carried := v_carried + 1; WHEN 'leave' THEN v_unresolved := v_unresolved + 1; END CASE;
  END LOOP;
  UPDATE aqd_weeks SET status = 'archived', checked_out_by = p_user_id, checked_out_at = now(),
    performance_summary = jsonb_build_object('resolved', v_resolved, 'carried', v_carried, 'unresolved', v_unresolved,
      'completion_rate', CASE WHEN (v_resolved + v_carried + v_unresolved) > 0 THEN ROUND(v_resolved::numeric / (v_resolved + v_carried + v_unresolved) * 100) ELSE 0 END),
    updated_at = now() WHERE id = p_week_id;
  IF v_carried > 0 THEN
    v_new_week_id := aqd_get_or_create_current_week(v_list_id);
    INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, taskhub_key, due_date, is_carryover, carryover_from_week_id, carryover_count, created_by)
    SELECT list_id, v_new_week_id, ROW_NUMBER() OVER (ORDER BY rank)::INT, title, description, 'not_started', assignee_id, taskhub_key, due_date, true, p_week_id, carryover_count + 1, created_by
    FROM aqd_items WHERE week_id = p_week_id AND checkout_decision = 'carry';
  ELSE v_new_week_id := aqd_get_or_create_current_week(v_list_id);
  END IF;
  RETURN jsonb_build_object('success', true, 'resolved', v_resolved, 'carried', v_carried, 'unresolved', v_unresolved, 'new_week_id', v_new_week_id);
END; $$;

-- TRIGGERS
CREATE FUNCTION aqd_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER aqd_lists_updated_at BEFORE UPDATE ON aqd_lists FOR EACH ROW EXECUTE FUNCTION aqd_set_updated_at();
CREATE TRIGGER aqd_weeks_updated_at BEFORE UPDATE ON aqd_weeks FOR EACH ROW EXECUTE FUNCTION aqd_set_updated_at();
CREATE TRIGGER aqd_items_updated_at BEFORE UPDATE ON aqd_items FOR EACH ROW EXECUTE FUNCTION aqd_set_updated_at();

CREATE FUNCTION aqd_record_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by) VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.assignee_id); END IF;
  IF OLD.title IS DISTINCT FROM NEW.title THEN INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by) VALUES (NEW.id, 'title', OLD.title, NEW.title, NEW.assignee_id); END IF;
  IF OLD.rank IS DISTINCT FROM NEW.rank AND OLD.rank != 0 AND NEW.rank != 0 THEN INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by) VALUES (NEW.id, 'rank', OLD.rank::text, NEW.rank::text, NEW.assignee_id); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER aqd_items_history AFTER UPDATE ON aqd_items FOR EACH ROW EXECUTE FUNCTION aqd_record_history();