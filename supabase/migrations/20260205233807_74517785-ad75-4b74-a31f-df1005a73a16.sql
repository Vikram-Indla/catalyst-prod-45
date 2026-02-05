-- ============================================================
-- PRIORITIES MODULE — Phase 5 Database Schema
-- 7 Tables, 3 Views, 4 Functions
-- ============================================================

-- ============================================================
-- TABLE 1: pri_lists — Priority list containers
-- ============================================================
CREATE TABLE pri_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workstream    TEXT CHECK (workstream IN (
                  'senaie', 'catalyst', 'tahommona', 'delivery',
                  'mim', 'standalone', 'dataai'
                )),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pri_lists_owner ON pri_lists(owner_id);
CREATE INDEX idx_pri_lists_status ON pri_lists(status);
CREATE INDEX idx_pri_lists_workstream ON pri_lists(workstream);

-- RLS
ALTER TABLE pri_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_lists_select" ON pri_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_lists_insert" ON pri_lists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_lists_update" ON pri_lists FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pri_lists_delete" ON pri_lists FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION pri_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pri_lists_updated
  BEFORE UPDATE ON pri_lists
  FOR EACH ROW EXECUTE FUNCTION pri_update_timestamp();


-- ============================================================
-- TABLE 2: pri_weeks — Weekly time periods
-- ============================================================
CREATE TABLE pri_weeks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id       UUID NOT NULL REFERENCES pri_lists(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'checked_out', 'archived')),
  checked_out_at TIMESTAMPTZ,
  checked_out_by UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, week_start)
);

-- Indexes
CREATE INDEX idx_pri_weeks_list ON pri_weeks(list_id);
CREATE INDEX idx_pri_weeks_status ON pri_weeks(status);
CREATE INDEX idx_pri_weeks_dates ON pri_weeks(week_start, week_end);

-- RLS
ALTER TABLE pri_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_weeks_select" ON pri_weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_weeks_insert" ON pri_weeks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_weeks_update" ON pri_weeks FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER pri_weeks_updated
  BEFORE UPDATE ON pri_weeks
  FOR EACH ROW EXECUTE FUNCTION pri_update_timestamp();


-- ============================================================
-- TABLE 3: pri_labels — Reusable category labels
-- ============================================================
CREATE TABLE pri_labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id       UUID NOT NULL REFERENCES pri_lists(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#3b82f6',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, name)
);

CREATE INDEX idx_pri_labels_list ON pri_labels(list_id);

ALTER TABLE pri_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_labels_select" ON pri_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_labels_insert" ON pri_labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_labels_update" ON pri_labels FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pri_labels_delete" ON pri_labels FOR DELETE TO authenticated USING (true);


-- ============================================================
-- TABLE 4: pri_items — Priority items (rank 1-20)
-- ============================================================
CREATE TABLE pri_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id       UUID NOT NULL REFERENCES pri_lists(id) ON DELETE CASCADE,
  week_id       UUID NOT NULL REFERENCES pri_weeks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'completed')),
  rank          INT NOT NULL DEFAULT 999,
  assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_key      TEXT,
  is_carryover  BOOLEAN NOT NULL DEFAULT false,
  source_item_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add self-reference after table creation
ALTER TABLE pri_items ADD CONSTRAINT pri_items_source_item_fkey 
  FOREIGN KEY (source_item_id) REFERENCES pri_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_pri_items_week ON pri_items(week_id);
CREATE INDEX idx_pri_items_list ON pri_items(list_id);
CREATE INDEX idx_pri_items_rank ON pri_items(week_id, rank);
CREATE INDEX idx_pri_items_status ON pri_items(status);
CREATE INDEX idx_pri_items_assignee ON pri_items(assignee_id);
CREATE INDEX idx_pri_items_task_key ON pri_items(task_key);

ALTER TABLE pri_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_items_select" ON pri_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_items_insert" ON pri_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_items_update" ON pri_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pri_items_delete" ON pri_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER pri_items_updated
  BEFORE UPDATE ON pri_items
  FOR EACH ROW EXECUTE FUNCTION pri_update_timestamp();


-- ============================================================
-- TABLE 5: pri_item_labels — Item-label junction
-- ============================================================
CREATE TABLE pri_item_labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES pri_items(id) ON DELETE CASCADE,
  label_id      UUID NOT NULL REFERENCES pri_labels(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, label_id)
);

CREATE INDEX idx_pri_item_labels_item ON pri_item_labels(item_id);
CREATE INDEX idx_pri_item_labels_label ON pri_item_labels(label_id);

ALTER TABLE pri_item_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_item_labels_select" ON pri_item_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_item_labels_insert" ON pri_item_labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_item_labels_delete" ON pri_item_labels FOR DELETE TO authenticated USING (true);


-- ============================================================
-- TABLE 6: pri_item_notes — Comments on items
-- ============================================================
CREATE TABLE pri_item_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES pri_items(id) ON DELETE CASCADE,
  author_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pri_item_notes_item ON pri_item_notes(item_id);

ALTER TABLE pri_item_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_item_notes_select" ON pri_item_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_item_notes_insert" ON pri_item_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pri_item_notes_update" ON pri_item_notes FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "pri_item_notes_delete" ON pri_item_notes FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TRIGGER pri_item_notes_updated
  BEFORE UPDATE ON pri_item_notes
  FOR EACH ROW EXECUTE FUNCTION pri_update_timestamp();


-- ============================================================
-- TABLE 7: pri_item_history — Audit trail
-- ============================================================
CREATE TABLE pri_item_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES pri_items(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL CHECK (action IN (
                  'created', 'status_changed', 'rank_changed',
                  'assigned', 'title_changed', 'description_changed',
                  'label_added', 'label_removed', 'carried_over',
                  'checked_out', 'deleted'
                )),
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pri_item_history_item ON pri_item_history(item_id);
CREATE INDEX idx_pri_item_history_action ON pri_item_history(action);
CREATE INDEX idx_pri_item_history_created ON pri_item_history(created_at DESC);

ALTER TABLE pri_item_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pri_item_history_select" ON pri_item_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "pri_item_history_insert" ON pri_item_history FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- VIEW 1: pri_items_full
-- Items + assignee name + labels array + note count
-- ============================================================
CREATE OR REPLACE VIEW pri_items_full AS
SELECT
  i.*,
  p.full_name   AS assignee_name,
  p.avatar_url  AS assignee_avatar,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'color', l.color
    ) ORDER BY l.name)
    FROM pri_item_labels il
    JOIN pri_labels l ON l.id = il.label_id
    WHERE il.item_id = i.id),
    '[]'::jsonb
  ) AS labels,
  (SELECT COUNT(*) FROM pri_item_notes n WHERE n.item_id = i.id)::int AS note_count
FROM pri_items i
LEFT JOIN profiles p ON p.id = i.assignee_id;


-- ============================================================
-- VIEW 2: pri_lists_full
-- Lists + owner name + current week + item stats
-- ============================================================
CREATE OR REPLACE VIEW pri_lists_full AS
SELECT
  l.*,
  p.full_name   AS owner_name,
  p.avatar_url  AS owner_avatar,
  (SELECT w.id FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_id,
  (SELECT w.week_start FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_start,
  (SELECT w.week_end FROM pri_weeks w
   WHERE w.list_id = l.id AND w.status = 'active'
   ORDER BY w.week_start DESC LIMIT 1
  ) AS current_week_end,
  (SELECT COUNT(*) FROM pri_weeks w WHERE w.list_id = l.id)::int AS total_weeks,
  (SELECT COUNT(*) FROM pri_items i
   JOIN pri_weeks w ON w.id = i.week_id
   WHERE w.list_id = l.id AND w.status = 'active'
  )::int AS active_item_count,
  (SELECT COUNT(*) FROM pri_items i
   JOIN pri_weeks w ON w.id = i.week_id
   WHERE w.list_id = l.id AND w.status = 'active' AND i.status = 'completed'
  )::int AS completed_item_count
FROM pri_lists l
LEFT JOIN profiles p ON p.id = l.owner_id;


-- ============================================================
-- VIEW 3: pri_weeks_full
-- Weeks + item statistics
-- ============================================================
CREATE OR REPLACE VIEW pri_weeks_full AS
SELECT
  w.*,
  p.full_name   AS checked_out_by_name,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id)::int AS total_items,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'todo')::int AS todo_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'in_progress')::int AS in_progress_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.status = 'completed')::int AS completed_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.is_carryover = true)::int AS carryover_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.rank <= 10)::int AS top_count,
  (SELECT COUNT(*) FROM pri_items i WHERE i.week_id = w.id AND i.rank > 10)::int AS overflow_count
FROM pri_weeks w
LEFT JOIN profiles p ON p.id = w.checked_out_by;


-- ============================================================
-- FUNCTION 1: pri_get_or_create_current_week
-- Gets the active week for a list, or creates one for this week
-- ============================================================
CREATE OR REPLACE FUNCTION pri_get_or_create_current_week(
  p_list_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_id UUID;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Calculate current week boundaries (Sunday-based)
  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  v_week_end := v_week_start + INTERVAL '4 days'; -- Friday

  -- Try to find existing active week
  SELECT id INTO v_week_id
  FROM pri_weeks
  WHERE list_id = p_list_id
    AND status = 'active'
    AND week_start = v_week_start;

  -- Create if not found
  IF v_week_id IS NULL THEN
    INSERT INTO pri_weeks (list_id, week_start, week_end, status)
    VALUES (p_list_id, v_week_start, v_week_end, 'active')
    RETURNING id INTO v_week_id;
  END IF;

  RETURN v_week_id;
END;
$$;


-- ============================================================
-- FUNCTION 2: pri_cycle_item_status
-- Three-state toggle: todo → in_progress → completed → todo
-- ============================================================
CREATE OR REPLACE FUNCTION pri_cycle_item_status(
  p_item_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current TEXT;
  v_next TEXT;
BEGIN
  SELECT status INTO v_current FROM pri_items WHERE id = p_item_id;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;

  -- Cycle: todo → in_progress → completed → todo
  v_next := CASE v_current
    WHEN 'todo' THEN 'in_progress'
    WHEN 'in_progress' THEN 'completed'
    WHEN 'completed' THEN 'todo'
  END;

  UPDATE pri_items SET status = v_next WHERE id = p_item_id;

  -- Audit trail
  INSERT INTO pri_item_history (item_id, actor_id, action, old_value, new_value)
  VALUES (p_item_id, COALESCE(p_actor_id, auth.uid()), 'status_changed', v_current, v_next);

  RETURN v_next;
END;
$$;


-- ============================================================
-- FUNCTION 3: pri_reorder_items
-- Accepts an ordered array of item IDs, assigns rank 1..N
-- ============================================================
CREATE OR REPLACE FUNCTION pri_reorder_items(
  p_week_id UUID,
  p_item_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank INT := 1;
  v_item_id UUID;
BEGIN
  FOREACH v_item_id IN ARRAY p_item_ids
  LOOP
    UPDATE pri_items
    SET rank = v_rank
    WHERE id = v_item_id AND week_id = p_week_id;

    v_rank := v_rank + 1;
  END LOOP;
END;
$$;


-- ============================================================
-- FUNCTION 4: pri_checkout_week
-- Weekly checkout with decisions per item
-- decisions: [{ "item_id": UUID, "decision": "resolved"|"carry"|"leave" }]
-- ============================================================
CREATE OR REPLACE FUNCTION pri_checkout_week(
  p_week_id UUID,
  p_decisions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_id UUID;
  v_new_week_id UUID;
  v_new_start DATE;
  v_new_end DATE;
  v_decision JSONB;
  v_item_id UUID;
  v_action TEXT;
  v_new_item_id UUID;
  v_item RECORD;
BEGIN
  -- Get list_id from week
  SELECT list_id INTO v_list_id FROM pri_weeks WHERE id = p_week_id;

  IF v_list_id IS NULL THEN
    RAISE EXCEPTION 'Week not found: %', p_week_id;
  END IF;

  -- Mark current week as checked out
  UPDATE pri_weeks
  SET status = 'checked_out',
      checked_out_at = now(),
      checked_out_by = auth.uid()
  WHERE id = p_week_id;

  -- Create next week
  SELECT week_end + INTERVAL '2 days' INTO v_new_start
  FROM pri_weeks WHERE id = p_week_id;
  v_new_end := v_new_start + INTERVAL '4 days';

  INSERT INTO pri_weeks (list_id, week_start, week_end, status)
  VALUES (v_list_id, v_new_start, v_new_end, 'active')
  RETURNING id INTO v_new_week_id;

  -- Process each decision
  FOR v_decision IN SELECT * FROM jsonb_array_elements(p_decisions)
  LOOP
    v_item_id := (v_decision->>'item_id')::UUID;
    v_action := v_decision->>'decision';

    IF v_action = 'resolved' THEN
      -- Mark as completed if not already
      UPDATE pri_items SET status = 'completed' WHERE id = v_item_id;

      INSERT INTO pri_item_history (item_id, actor_id, action, new_value)
      VALUES (v_item_id, auth.uid(), 'checked_out', 'resolved');

    ELSIF v_action = 'carry' THEN
      -- Create carryover item in new week
      SELECT * INTO v_item FROM pri_items WHERE id = v_item_id;

      INSERT INTO pri_items (
        list_id, week_id, title, description, status,
        rank, assignee_id, task_key, is_carryover, source_item_id
      ) VALUES (
        v_list_id, v_new_week_id, v_item.title, v_item.description, 'todo',
        v_item.rank, v_item.assignee_id, v_item.task_key, true, v_item_id
      ) RETURNING id INTO v_new_item_id;

      -- Copy labels
      INSERT INTO pri_item_labels (item_id, label_id)
      SELECT v_new_item_id, label_id
      FROM pri_item_labels WHERE item_id = v_item_id;

      -- Audit
      INSERT INTO pri_item_history (item_id, actor_id, action, new_value)
      VALUES (v_item_id, auth.uid(), 'checked_out', 'carried_over');

      INSERT INTO pri_item_history (item_id, actor_id, action, old_value)
      VALUES (v_new_item_id, auth.uid(), 'carried_over', v_item_id::text);

    ELSIF v_action = 'leave' THEN
      -- Leave in checked-out week, no action needed
      INSERT INTO pri_item_history (item_id, actor_id, action, new_value)
      VALUES (v_item_id, auth.uid(), 'checked_out', 'left');
    END IF;
  END LOOP;

  RETURN v_new_week_id;
END;
$$;