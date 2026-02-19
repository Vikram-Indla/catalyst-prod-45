
-- Prerequisites
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Drop old ph_user_preferences (from ProdHub) to recreate with new schema
DROP TABLE IF EXISTS ph_user_preferences CASCADE;

-- ═══ TABLE 1: ph_projects ═══
CREATE TABLE IF NOT EXISTS ph_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(6) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  department      VARCHAR(100) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  health          VARCHAR(20) DEFAULT 'on_track'
                    CHECK (health IN ('on_track', 'at_risk', 'off_track')),
  health_override BOOLEAN DEFAULT false,
  icon            VARCHAR(30) DEFAULT 'rocket',
  color           VARCHAR(7) DEFAULT '#2563EB',
  start_date      DATE,
  end_date        DATE,
  feature_layer   BOOLEAN DEFAULT false,
  ai_assist       BOOLEAN DEFAULT true,
  is_archived     BOOLEAN DEFAULT false,
  archived_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_projects_key ON ph_projects(key);
CREATE INDEX IF NOT EXISTS idx_ph_projects_status ON ph_projects(status) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_ph_projects_department ON ph_projects(department);
CREATE INDEX IF NOT EXISTS idx_ph_projects_created_by ON ph_projects(created_by);

DROP TRIGGER IF EXISTS set_ph_projects_updated_at ON ph_projects;
CREATE TRIGGER set_ph_projects_updated_at
  BEFORE UPDATE ON ph_projects
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE ph_projects ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 2: ph_project_members ═══
CREATE TABLE IF NOT EXISTS ph_project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  role        VARCHAR(10) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member', 'viewer')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ph_members_project ON ph_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_ph_members_user ON ph_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ph_members_role ON ph_project_members(project_id, role);

ALTER TABLE ph_project_members ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 3: ph_user_preferences (new schema) ═══
CREATE TABLE ph_user_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  project_id      UUID REFERENCES ph_projects(id) ON DELETE CASCADE,
  preference_key  VARCHAR(50) NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_ph_prefs_user ON ph_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ph_prefs_user_project ON ph_user_preferences(user_id, project_id);

ALTER TABLE ph_user_preferences ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 4: ph_workflow_statuses ═══
CREATE TABLE IF NOT EXISTS ph_workflow_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  category    VARCHAR(15) NOT NULL
                CHECK (category IN ('todo', 'in_progress', 'done', 'terminal')),
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ph_statuses_project ON ph_workflow_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_ph_statuses_position ON ph_workflow_statuses(project_id, position);

ALTER TABLE ph_workflow_statuses ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 5: ph_work_types ═══
CREATE TABLE IF NOT EXISTS ph_work_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  name        VARCHAR(30) NOT NULL,
  icon        VARCHAR(30) NOT NULL,
  color       VARCHAR(7) NOT NULL,
  level       VARCHAR(10) NOT NULL
                CHECK (level IN ('top', 'mid', 'work', 'child')),
  is_enabled  BOOLEAN DEFAULT true,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ph_types_project ON ph_work_types(project_id);

ALTER TABLE ph_work_types ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 6: ph_type_field_layouts ═══
CREATE TABLE IF NOT EXISTS ph_type_field_layouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id       UUID NOT NULL REFERENCES ph_work_types(id) ON DELETE CASCADE,
  field_name    VARCHAR(50) NOT NULL,
  field_type    VARCHAR(30) NOT NULL,
  is_required   BOOLEAN DEFAULT false,
  is_type_specific BOOLEAN DEFAULT false,
  position      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(type_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_ph_field_layouts_type ON ph_type_field_layouts(type_id);

ALTER TABLE ph_type_field_layouts ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 7: ph_labels ═══
CREATE TABLE IF NOT EXISTS ph_labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  name        VARCHAR(30) NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ph_labels_project ON ph_labels(project_id);

ALTER TABLE ph_labels ENABLE ROW LEVEL SECURITY;

-- ═══ TABLE 8: ph_components ═══
CREATE TABLE IF NOT EXISTS ph_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ph_components_project ON ph_components(project_id);

ALTER TABLE ph_components ENABLE ROW LEVEL SECURITY;

-- ═══ RLS POLICIES (use IF NOT EXISTS pattern via DO blocks) ═══

-- ph_projects policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view their projects" ON ph_projects;
  DROP POLICY IF EXISTS "Admins create projects" ON ph_projects;
  DROP POLICY IF EXISTS "Project admins update" ON ph_projects;
  DROP POLICY IF EXISTS "Project admins delete" ON ph_projects;
END $$;

CREATE POLICY "Users view their projects"
  ON ph_projects FOR SELECT
  USING (id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins create projects"
  ON ph_projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project admins update"
  ON ph_projects FOR UPDATE
  USING (id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Project admins delete"
  ON ph_projects FOR DELETE
  USING (id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ph_project_members policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view project members" ON ph_project_members;
  DROP POLICY IF EXISTS "Admins add members" ON ph_project_members;
  DROP POLICY IF EXISTS "Admins update member roles" ON ph_project_members;
  DROP POLICY IF EXISTS "Admins remove members" ON ph_project_members;
END $$;

CREATE POLICY "Members view project members"
  ON ph_project_members FOR SELECT
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins add members"
  ON ph_project_members FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins update member roles"
  ON ph_project_members FOR UPDATE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins remove members"
  ON ph_project_members FOR DELETE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ph_user_preferences policy
CREATE POLICY "Users manage own preferences"
  ON ph_user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ph_workflow_statuses policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view statuses" ON ph_workflow_statuses;
  DROP POLICY IF EXISTS "Admins manage statuses" ON ph_workflow_statuses;
  DROP POLICY IF EXISTS "Admins update statuses" ON ph_workflow_statuses;
  DROP POLICY IF EXISTS "Admins delete statuses" ON ph_workflow_statuses;
END $$;

CREATE POLICY "Members view statuses"
  ON ph_workflow_statuses FOR SELECT
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage statuses"
  ON ph_workflow_statuses FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins update statuses"
  ON ph_workflow_statuses FOR UPDATE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins delete statuses"
  ON ph_workflow_statuses FOR DELETE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ph_work_types policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view types" ON ph_work_types;
  DROP POLICY IF EXISTS "Admins manage types" ON ph_work_types;
END $$;

CREATE POLICY "Members view types"
  ON ph_work_types FOR SELECT
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage types"
  ON ph_work_types FOR ALL
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ph_type_field_layouts policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view field layouts" ON ph_type_field_layouts;
END $$;

CREATE POLICY "Members view field layouts"
  ON ph_type_field_layouts FOR SELECT
  USING (type_id IN (SELECT t.id FROM ph_work_types t JOIN ph_project_members m ON m.project_id = t.project_id WHERE m.user_id = auth.uid()));

-- ph_labels policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view labels" ON ph_labels;
  DROP POLICY IF EXISTS "Members manage labels" ON ph_labels;
  DROP POLICY IF EXISTS "Members update labels" ON ph_labels;
  DROP POLICY IF EXISTS "Admins delete labels" ON ph_labels;
END $$;

CREATE POLICY "Members view labels"
  ON ph_labels FOR SELECT
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Members manage labels"
  ON ph_labels FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role IN ('admin', 'member')));

CREATE POLICY "Members update labels"
  ON ph_labels FOR UPDATE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role IN ('admin', 'member')));

CREATE POLICY "Admins delete labels"
  ON ph_labels FOR DELETE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ph_components policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members view components" ON ph_components;
  DROP POLICY IF EXISTS "Members manage components" ON ph_components;
  DROP POLICY IF EXISTS "Members update components" ON ph_components;
  DROP POLICY IF EXISTS "Admins delete components" ON ph_components;
END $$;

CREATE POLICY "Members view components"
  ON ph_components FOR SELECT
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()));

CREATE POLICY "Members manage components"
  ON ph_components FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role IN ('admin', 'member')));

CREATE POLICY "Members update components"
  ON ph_components FOR UPDATE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role IN ('admin', 'member')));

CREATE POLICY "Admins delete components"
  ON ph_components FOR DELETE
  USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ═══ TRIGGER FUNCTIONS ═══

CREATE OR REPLACE FUNCTION ph_check_last_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM ph_project_members WHERE project_id = OLD.project_id AND role = 'admin' AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last admin of a project';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ph_prevent_last_admin_removal ON ph_project_members;
CREATE TRIGGER ph_prevent_last_admin_removal
  BEFORE DELETE ON ph_project_members
  FOR EACH ROW EXECUTE FUNCTION ph_check_last_admin();

DROP TRIGGER IF EXISTS ph_prevent_last_admin_demotion ON ph_project_members;
CREATE TRIGGER ph_prevent_last_admin_demotion
  BEFORE UPDATE OF role ON ph_project_members
  FOR EACH ROW WHEN (OLD.role = 'admin' AND NEW.role != 'admin')
  EXECUTE FUNCTION ph_check_last_admin();

CREATE OR REPLACE FUNCTION ph_prevent_default_status_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete the default status. Set another status as default first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ph_protect_default_status ON ph_workflow_statuses;
CREATE TRIGGER ph_protect_default_status
  BEFORE DELETE ON ph_workflow_statuses
  FOR EACH ROW EXECUTE FUNCTION ph_prevent_default_status_delete();

-- ═══ SEED FUNCTIONS ═══

CREATE OR REPLACE FUNCTION ph_seed_default_workflow(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ph_workflow_statuses (project_id, name, color, category, position, is_default) VALUES
    (p_project_id, 'To Do',       '#A3A3A3', 'todo',        0, true),
    (p_project_id, 'In Progress', '#2563EB', 'in_progress', 1, false),
    (p_project_id, 'In Review',   '#D97706', 'in_progress', 2, false),
    (p_project_id, 'Done',        '#0D9488', 'done',        3, false),
    (p_project_id, 'Cancelled',   '#D4D4D4', 'terminal',    4, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ph_seed_default_types(p_project_id UUID, p_feature_layer BOOLEAN DEFAULT false)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ph_work_types (project_id, name, icon, color, level, is_enabled, position) VALUES
    (p_project_id, 'Epic',     'zap',               '#7C3AED', 'top',   true, 0),
    (p_project_id, 'Feature',  'layers',            '#2563EB', 'mid',   p_feature_layer, 1),
    (p_project_id, 'Story',    'bookmark',          '#0D9488', 'work',  true, 2),
    (p_project_id, 'Bug',      'bug',               '#DC2626', 'work',  true, 3),
    (p_project_id, 'Task',     'check-square',      '#D97706', 'work',  true, 4),
    (p_project_id, 'Subtask',  'corner-down-right', '#64748B', 'child', true, 5);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ph_seed_default_field_layouts(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_type RECORD;
BEGIN
  FOR v_type IN SELECT id, name FROM ph_work_types WHERE project_id = p_project_id
  LOOP
    INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_required, position) VALUES
      (v_type.id, 'Title',       'text',         true,  0),
      (v_type.id, 'Type',        'select',       true,  1),
      (v_type.id, 'Status',      'select',       true,  2),
      (v_type.id, 'Assignee',    'user-picker',  false, 3),
      (v_type.id, 'Priority',    'select',       false, 4),
      (v_type.id, 'Labels',      'multi-select', false, 5),
      (v_type.id, 'Components',  'multi-select', false, 6),
      (v_type.id, 'Due Date',    'date',         false, 7),
      (v_type.id, 'Description', 'rich-text',    false, 8),
      (v_type.id, 'Attachments', 'file-upload',  false, 9);

    IF v_type.name = 'Epic' THEN
      INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_type_specific, position) VALUES
        (v_type.id, 'Target Start Date', 'date',   true, 10),
        (v_type.id, 'Target End Date',   'date',   true, 11),
        (v_type.id, 'Business Value',    'select', true, 12);
    ELSIF v_type.name = 'Feature' THEN
      INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_type_specific, position) VALUES
        (v_type.id, 'Target Start Date', 'date', true, 10),
        (v_type.id, 'Target End Date',   'date', true, 11);
    ELSIF v_type.name IN ('Story', 'Task', 'Subtask') THEN
      INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_type_specific, position) VALUES
        (v_type.id, 'Story Points', 'number', true, 10);
      IF v_type.name = 'Story' THEN
        INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_type_specific, position) VALUES
          (v_type.id, 'Acceptance Criteria', 'checklist', true, 11);
      END IF;
    ELSIF v_type.name = 'Bug' THEN
      INSERT INTO ph_type_field_layouts (type_id, field_name, field_type, is_type_specific, position) VALUES
        (v_type.id, 'Severity',           'select',    true, 10),
        (v_type.id, 'Steps to Reproduce', 'rich-text', true, 11),
        (v_type.id, 'Expected Behavior',  'rich-text', true, 12),
        (v_type.id, 'Actual Behavior',    'rich-text', true, 13);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══ PROJECT CREATION TRANSACTION ═══

CREATE OR REPLACE FUNCTION ph_create_project(
  p_name        VARCHAR,
  p_key         VARCHAR,
  p_department  VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_icon        VARCHAR DEFAULT 'rocket',
  p_color       VARCHAR DEFAULT '#2563EB',
  p_feature_layer BOOLEAN DEFAULT false,
  p_user_id     UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
BEGIN
  INSERT INTO ph_projects (name, key, department, description, icon, color, feature_layer, created_by)
  VALUES (p_name, UPPER(p_key), p_department, p_description, p_icon, p_color, p_feature_layer, p_user_id)
  RETURNING id INTO v_project_id;

  INSERT INTO ph_project_members (project_id, user_id, role)
  VALUES (v_project_id, p_user_id, 'admin');

  PERFORM ph_seed_default_workflow(v_project_id);
  PERFORM ph_seed_default_types(v_project_id, p_feature_layer);
  PERFORM ph_seed_default_field_layouts(v_project_id);

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
