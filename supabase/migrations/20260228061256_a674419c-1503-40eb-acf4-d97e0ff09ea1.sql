
-- Enable pg_trgm for summary search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE wh_priority AS ENUM ('highest','high','medium','low','lowest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wh_severity AS ENUM ('critical','major','moderate','minor','trivial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CORE TABLES
CREATE TABLE IF NOT EXISTS wh_work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, icon_glyph TEXT NOT NULL DEFAULT '●', icon_color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT, is_subtask BOOLEAN NOT NULL DEFAULT false, sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id), deleted_at TIMESTAMPTZ, UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS wh_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT NOT NULL CHECK (category IN ('todo','in_progress','done')),
  color_key TEXT NOT NULL DEFAULT 'gray', sort_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id), updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ, UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS wh_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status_id UUID NOT NULL REFERENCES wh_statuses(id) ON DELETE CASCADE,
  to_status_id UUID NOT NULL REFERENCES wh_statuses(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, from_status_id, to_status_id)
);

CREATE TABLE IF NOT EXISTS wh_fix_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, start_date DATE, release_date DATE,
  is_released BOOLEAN NOT NULL DEFAULT false, is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id), deleted_at TIMESTAMPTZ, UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS wh_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, color TEXT DEFAULT '#E2E8F0', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id), deleted_at TIMESTAMPTZ, UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS wh_link_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, inward_desc TEXT NOT NULL, outward_desc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORK ITEMS
CREATE TABLE IF NOT EXISTS wh_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_type_id UUID NOT NULL REFERENCES wh_work_types(id),
  status_id UUID NOT NULL REFERENCES wh_statuses(id),
  parent_id UUID REFERENCES wh_work_items(id) ON DELETE SET NULL,
  fix_version_id UUID REFERENCES wh_fix_versions(id) ON DELETE SET NULL,
  item_key TEXT NOT NULL, key_sequence INT NOT NULL, summary TEXT NOT NULL, description TEXT,
  assignee_id UUID REFERENCES profiles(id), reporter_id UUID REFERENCES profiles(id),
  priority wh_priority NOT NULL DEFAULT 'medium', severity wh_severity,
  rank TEXT NOT NULL DEFAULT '0|aaaaaa:', original_estimate_minutes INT,
  remaining_estimate_minutes INT, time_spent_minutes INT DEFAULT 0,
  environment TEXT, resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id), updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ, UNIQUE(project_id, item_key)
);

CREATE TABLE IF NOT EXISTS wh_project_key_sequences (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL, last_number INT NOT NULL DEFAULT 0
);

-- JUNCTION TABLES
CREATE TABLE IF NOT EXISTS wh_work_item_labels (
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES wh_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (work_item_id, label_id)
);

CREATE TABLE IF NOT EXISTS wh_work_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_type_id UUID NOT NULL REFERENCES wh_link_types(id),
  source_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(link_type_id, source_item_id, target_item_id),
  CHECK(source_item_id <> target_item_id)
);

-- ACTIVITY TABLES
CREATE TABLE IF NOT EXISTS wh_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id), body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wh_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  time_spent_minutes INT NOT NULL CHECK (time_spent_minutes > 0),
  work_date DATE NOT NULL DEFAULT CURRENT_DATE, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wh_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size INT NOT NULL,
  mime_type TEXT NOT NULL, uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wh_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id), field_name TEXT NOT NULL,
  old_value TEXT, new_value TEXT, old_display TEXT, new_display TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER PREFERENCES
CREATE TABLE IF NOT EXISTS wh_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id), name TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}', is_shared BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wh_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id), columns JSONB NOT NULL DEFAULT '[]',
  view_type TEXT NOT NULL DEFAULT 'table' CHECK (view_type IN ('table','split','board')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, view_type)
);

CREATE TABLE IF NOT EXISTS wh_project_stars (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS wh_project_recents (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  last_visited TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, project_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_wh_work_items_project ON wh_work_items(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_status ON wh_work_items(status_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_assignee ON wh_work_items(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_parent ON wh_work_items(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_type ON wh_work_items(work_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_fix_version ON wh_work_items(fix_version_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_rank ON wh_work_items(project_id, rank) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_created ON wh_work_items(project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_key ON wh_work_items(item_key);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_summary_trgm ON wh_work_items USING gin(summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wh_comments_item ON wh_comments(work_item_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_logs_item ON wh_work_logs(work_item_id, work_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_attachments_item ON wh_attachments(work_item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_history_item ON wh_history(work_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wh_transitions_from ON wh_workflow_transitions(from_status_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wh_stars_user ON wh_project_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_wh_recents_user ON wh_project_recents(user_id, last_visited DESC);

-- VIEWS
CREATE OR REPLACE VIEW wh_all_work_list AS
SELECT
  wi.id, wi.project_id, wi.item_key, wi.key_sequence, wi.summary, wi.description,
  wi.priority, wi.severity, wi.rank, wi.created_at, wi.updated_at,
  wt.id AS work_type_id, wt.name AS work_type_name, wt.icon_glyph, wt.icon_color, wt.is_subtask,
  ws.id AS status_id, ws.name AS status_name, ws.category AS status_category, ws.color_key AS status_color,
  wi.parent_id, pw.item_key AS parent_key, pw.summary AS parent_summary,
  fv.id AS fix_version_id, fv.name AS fix_version_name,
  wi.assignee_id, ap.full_name AS assignee_name, ap.avatar_url AS assignee_avatar,
  wi.reporter_id, rp.full_name AS reporter_name,
  COALESCE(cc.comment_count, 0) AS comment_count,
  COALESCE(ac.attachment_count, 0) AS attachment_count,
  COALESCE(ch.child_count, 0) AS child_count,
  COALESCE(ll.label_list, '[]'::JSONB) AS labels
FROM wh_work_items wi
  JOIN wh_work_types wt ON wt.id = wi.work_type_id
  JOIN wh_statuses ws ON ws.id = wi.status_id
  LEFT JOIN wh_work_items pw ON pw.id = wi.parent_id
  LEFT JOIN wh_fix_versions fv ON fv.id = wi.fix_version_id
  LEFT JOIN profiles ap ON ap.id = wi.assignee_id
  LEFT JOIN profiles rp ON rp.id = wi.reporter_id
  LEFT JOIN LATERAL (SELECT COUNT(*)::INT AS comment_count FROM wh_comments c WHERE c.work_item_id = wi.id AND c.deleted_at IS NULL) cc ON true
  LEFT JOIN LATERAL (SELECT COUNT(*)::INT AS attachment_count FROM wh_attachments a WHERE a.work_item_id = wi.id AND a.deleted_at IS NULL) ac ON true
  LEFT JOIN LATERAL (SELECT COUNT(*)::INT AS child_count FROM wh_work_items ch WHERE ch.parent_id = wi.id AND ch.deleted_at IS NULL) ch ON true
  LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)), '[]'::JSONB) AS label_list FROM wh_work_item_labels wil JOIN wh_labels l ON l.id = wil.label_id WHERE wil.work_item_id = wi.id AND l.deleted_at IS NULL) ll ON true
WHERE wi.deleted_at IS NULL;

CREATE OR REPLACE VIEW wh_work_item_detail AS
SELECT wi.*, wt.name AS work_type_name, wt.icon_glyph, wt.icon_color, wt.is_subtask,
  ws.name AS status_name, ws.category AS status_category, ws.color_key AS status_color,
  fv.name AS fix_version_name, pw.item_key AS parent_key, pw.summary AS parent_summary,
  ap.full_name AS assignee_name, ap.avatar_url AS assignee_avatar,
  rp.full_name AS reporter_name, rp.avatar_url AS reporter_avatar
FROM wh_work_items wi
  JOIN wh_work_types wt ON wt.id = wi.work_type_id
  JOIN wh_statuses ws ON ws.id = wi.status_id
  LEFT JOIN wh_fix_versions fv ON fv.id = wi.fix_version_id
  LEFT JOIN wh_work_items pw ON pw.id = wi.parent_id
  LEFT JOIN profiles ap ON ap.id = wi.assignee_id
  LEFT JOIN profiles rp ON rp.id = wi.reporter_id
WHERE wi.deleted_at IS NULL;

CREATE OR REPLACE VIEW wh_valid_transitions AS
SELECT t.project_id, t.from_status_id, fs.name AS from_status_name,
  t.to_status_id, ts.name AS to_status_name, ts.color_key AS to_status_color, ts.category AS to_status_category
FROM wh_workflow_transitions t
  JOIN wh_statuses fs ON fs.id = t.from_status_id
  JOIN wh_statuses ts ON ts.id = t.to_status_id
WHERE t.is_active = true;

CREATE OR REPLACE VIEW wh_dashboard_stats AS
SELECT wi.project_id,
  COUNT(*) FILTER (WHERE wi.deleted_at IS NULL) AS total_items,
  COUNT(*) FILTER (WHERE ws.category = 'todo' AND wi.deleted_at IS NULL) AS todo_count,
  COUNT(*) FILTER (WHERE ws.category = 'in_progress' AND wi.deleted_at IS NULL) AS in_progress_count,
  COUNT(*) FILTER (WHERE ws.category = 'done' AND wi.deleted_at IS NULL) AS done_count,
  COUNT(*) FILTER (WHERE wi.priority = 'highest' AND ws.category != 'done' AND wi.deleted_at IS NULL) AS critical_open,
  COUNT(*) FILTER (WHERE wi.created_at > now() - INTERVAL '7 days' AND wi.deleted_at IS NULL) AS created_this_week,
  COUNT(*) FILTER (WHERE wi.updated_at > now() - INTERVAL '24 hours' AND wi.deleted_at IS NULL) AS updated_today
FROM wh_work_items wi JOIN wh_statuses ws ON ws.id = wi.status_id
GROUP BY wi.project_id;

CREATE OR REPLACE VIEW wh_sidebar_projects AS
SELECT p.id, p.name, p.key, p.color,
  CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END AS is_starred,
  r.last_visited
FROM projects p
  LEFT JOIN wh_project_stars s ON s.project_id = p.id
  LEFT JOIN wh_project_recents r ON r.project_id = p.id
WHERE p.is_archived = false;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION wh_generate_item_key() RETURNS TRIGGER AS $$
DECLARE v_key TEXT; v_num INT;
BEGIN
  UPDATE wh_project_key_sequences SET last_number = last_number + 1
    WHERE project_id = NEW.project_id RETURNING project_key, last_number INTO v_key, v_num;
  IF v_key IS NULL THEN RAISE EXCEPTION 'No key sequence found for project %', NEW.project_id; END IF;
  NEW.item_key := v_key || '-' || v_num; NEW.key_sequence := v_num; RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wh_generate_item_key ON wh_work_items;
CREATE TRIGGER trg_wh_generate_item_key BEFORE INSERT ON wh_work_items
  FOR EACH ROW WHEN (NEW.item_key IS NULL OR NEW.item_key = '') EXECUTE FUNCTION wh_generate_item_key();

CREATE OR REPLACE FUNCTION wh_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wh_work_items_updated ON wh_work_items;
CREATE TRIGGER trg_wh_work_items_updated BEFORE UPDATE ON wh_work_items FOR EACH ROW EXECUTE FUNCTION wh_set_updated_at();
DROP TRIGGER IF EXISTS trg_wh_comments_updated ON wh_comments;
CREATE TRIGGER trg_wh_comments_updated BEFORE UPDATE ON wh_comments FOR EACH ROW EXECUTE FUNCTION wh_set_updated_at();
DROP TRIGGER IF EXISTS trg_wh_work_logs_updated ON wh_work_logs;
CREATE TRIGGER trg_wh_work_logs_updated BEFORE UPDATE ON wh_work_logs FOR EACH ROW EXECUTE FUNCTION wh_set_updated_at();

CREATE OR REPLACE FUNCTION wh_track_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO wh_history (work_item_id, author_id, field_name, old_value, new_value, old_display, new_display)
    SELECT NEW.id, COALESCE(NEW.updated_by, NEW.created_by), 'status', OLD.status_id::TEXT, NEW.status_id::TEXT, os.name, ns.name
    FROM wh_statuses os, wh_statuses ns WHERE os.id = OLD.status_id AND ns.id = NEW.status_id;
  END IF;
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO wh_history (work_item_id, author_id, field_name, old_value, new_value, old_display, new_display)
    SELECT NEW.id, COALESCE(NEW.updated_by, NEW.created_by), 'assignee', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT,
      COALESCE(op.full_name, 'Unassigned'), COALESCE(np.full_name, 'Unassigned')
    FROM (SELECT full_name FROM profiles WHERE id = OLD.assignee_id) op,
         (SELECT full_name FROM profiles WHERE id = NEW.assignee_id) np;
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO wh_history (work_item_id, author_id, field_name, old_value, new_value, old_display, new_display)
    VALUES (NEW.id, COALESCE(NEW.updated_by, NEW.created_by), 'priority', OLD.priority::TEXT, NEW.priority::TEXT, OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wh_track_changes ON wh_work_items;
CREATE TRIGGER trg_wh_track_changes AFTER UPDATE ON wh_work_items FOR EACH ROW EXECUTE FUNCTION wh_track_status_change();

CREATE OR REPLACE FUNCTION wh_update_time_spent() RETURNS TRIGGER AS $$
BEGIN
  UPDATE wh_work_items SET time_spent_minutes = COALESCE(time_spent_minutes, 0) + NEW.time_spent_minutes WHERE id = NEW.work_item_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wh_work_log_time ON wh_work_logs;
CREATE TRIGGER trg_wh_work_log_time AFTER INSERT ON wh_work_logs FOR EACH ROW EXECUTE FUNCTION wh_update_time_spent();

CREATE OR REPLACE FUNCTION wh_clone_work_item(p_source_id UUID, p_clone_links BOOLEAN DEFAULT true, p_clone_subtasks BOOLEAN DEFAULT false, p_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE v_new_id UUID; v_sub_id UUID; v_source RECORD;
BEGIN
  SELECT * INTO v_source FROM wh_work_items WHERE id = p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source work item not found'; END IF;
  INSERT INTO wh_work_items (project_id, work_type_id, status_id, parent_id, fix_version_id, summary, description, assignee_id, reporter_id, priority, severity, created_by, updated_by)
  SELECT v_source.project_id, v_source.work_type_id,
    (SELECT id FROM wh_statuses WHERE project_id = v_source.project_id AND is_default = true LIMIT 1),
    v_source.parent_id, v_source.fix_version_id, 'CLONE - ' || v_source.summary, v_source.description,
    v_source.assignee_id, p_user_id, v_source.priority, v_source.severity, p_user_id, p_user_id
  RETURNING id INTO v_new_id;
  INSERT INTO wh_work_item_labels (work_item_id, label_id) SELECT v_new_id, label_id FROM wh_work_item_labels WHERE work_item_id = p_source_id;
  IF p_clone_links THEN
    INSERT INTO wh_work_item_links (link_type_id, source_item_id, target_item_id, created_by)
    SELECT link_type_id, v_new_id, target_item_id, p_user_id FROM wh_work_item_links WHERE source_item_id = p_source_id;
  END IF;
  IF p_clone_subtasks THEN
    FOR v_sub_id IN SELECT id FROM wh_work_items WHERE parent_id = p_source_id AND deleted_at IS NULL LOOP
      PERFORM wh_clone_work_item(v_sub_id, false, false, p_user_id);
      UPDATE wh_work_items SET parent_id = v_new_id WHERE id = (SELECT id FROM wh_work_items ORDER BY created_at DESC LIMIT 1);
    END LOOP;
  END IF;
  RETURN v_new_id;
END; $$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE wh_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_fix_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_link_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_work_item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_work_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_project_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_project_recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_project_key_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_work_items_select" ON wh_work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_work_items_insert" ON wh_work_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "wh_work_items_update" ON wh_work_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "wh_work_items_delete" ON wh_work_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "wh_work_types_select" ON wh_work_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_statuses_select" ON wh_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_transitions_select" ON wh_workflow_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_fix_versions_select" ON wh_fix_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_labels_all" ON wh_labels FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_link_types_select" ON wh_link_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_work_item_labels_all" ON wh_work_item_labels FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_work_item_links_all" ON wh_work_item_links FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_comments_all" ON wh_comments FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_work_logs_all" ON wh_work_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_attachments_all" ON wh_attachments FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_history_select" ON wh_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_saved_filters_all" ON wh_saved_filters FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_column_configs_all" ON wh_column_configs FOR ALL TO authenticated USING (true);
CREATE POLICY "wh_stars_all" ON wh_project_stars FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "wh_recents_all" ON wh_project_recents FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "wh_sequences_select" ON wh_project_key_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_sequences_update" ON wh_project_key_sequences FOR UPDATE TO authenticated USING (true);

-- Seed default link types
INSERT INTO wh_link_types (name, inward_desc, outward_desc) VALUES
  ('blocks', 'is blocked by', 'blocks'),
  ('clones', 'is cloned by', 'clones'),
  ('duplicates', 'is duplicated by', 'duplicates'),
  ('relates_to', 'relates to', 'relates to'),
  ('causes', 'is caused by', 'causes'),
  ('split_to', 'is split from', 'split to'),
  ('parent_of', 'is child of', 'is parent of')
ON CONFLICT (name) DO NOTHING;
