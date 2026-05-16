-- Work Items Settings: extend ph_work_types + add Screens, Layout, Fields tables.
-- Applied 2026-05-17 as part of Project Settings Work Items module build.

-- ─── 1. Extend ph_work_types with Jira-mirror config columns ─────────────────

ALTER TABLE ph_work_types
  ADD COLUMN IF NOT EXISTS workflow_name  TEXT,
  ADD COLUMN IF NOT EXISTS field_config   TEXT NOT NULL DEFAULT 'Default',
  ADD COLUMN IF NOT EXISTS screen_name    TEXT;

-- Seed BAU config from live Jira probe (2026-05-17)
DO $$
DECLARE v_pid uuid;
BEGIN
  SELECT id INTO v_pid FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_pid IS NULL THEN RETURN; END IF;

  UPDATE ph_work_types SET workflow_name = 'Sectorial Story Workflow',  field_config = 'Senaei 2.0 Field Config', screen_name = 'Master Story Scheme'       WHERE project_id = v_pid AND name = 'Story';
  UPDATE ph_work_types SET workflow_name = 'Software Simplified',       field_config = 'Default',               screen_name = 'SPN: Epic Screen'             WHERE project_id = v_pid AND name = 'Epic';
  UPDATE ph_work_types SET workflow_name = 'Senaei 2.0 Story',          field_config = 'Default',               screen_name = 'Feature'                      WHERE project_id = v_pid AND name = 'Feature';
  UPDATE ph_work_types SET workflow_name = 'Senaei 2.0 Story',          field_config = 'Default',               screen_name = 'Change Request'               WHERE project_id = v_pid AND name = 'Business Request';
  UPDATE ph_work_types SET workflow_name = 'Revamp Defect 6.0',         field_config = 'Default',               screen_name = 'Revamp QA Bug Scheme'         WHERE project_id = v_pid AND name = 'QA Bug';
  UPDATE ph_work_types SET workflow_name = 'Revamp Defect 6.0',         field_config = 'Senaei 2.0 Field Config', screen_name = 'Revamp production'          WHERE project_id = v_pid AND name = 'Production Incident';
  UPDATE ph_work_types SET workflow_name = 'Senaei 2.0 Story',          field_config = 'Default',               screen_name = 'SCN: Kanban Default'          WHERE project_id = v_pid AND name = 'Change Request';
  UPDATE ph_work_types SET workflow_name = 'Business Gap',              field_config = 'Default',               screen_name = 'Change Request'               WHERE project_id = v_pid AND name = 'Business Gap';
  UPDATE ph_work_types SET workflow_name = 'Software Simplified',       field_config = 'Default',               screen_name = 'SCN: Kanban Default'          WHERE project_id = v_pid AND name = 'Sub-task';
END;
$$;

-- ─── 2. ph_screen_config — per-work-type screen operations ───────────────────

CREATE TABLE IF NOT EXISTS ph_screen_config (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  work_type_id   uuid        NOT NULL REFERENCES ph_work_types(id) ON DELETE CASCADE,
  scheme_name    TEXT        NOT NULL DEFAULT 'SCN: Kanban Issue Type Screen Scheme',
  create_screen  TEXT,
  edit_screen    TEXT,
  view_screen    TEXT,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(project_id, work_type_id)
);

ALTER TABLE ph_screen_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_screen_config_select" ON ph_screen_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_screen_config.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "ph_screen_config_admin" ON ph_screen_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_screen_config.project_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Seed BAU screen config from live Jira probe (2026-05-17)
DO $$
DECLARE
  v_pid  uuid;
  v_tid  uuid;
  v_scheme TEXT := 'SCN: Kanban Issue Type Screen Scheme';

  -- Work type → screen mapping from Jira probe
  TYPE screen_map IS TABLE OF TEXT INDEX BY TEXT;

  CURSOR c_types IS
    SELECT id, name FROM ph_work_types
    WHERE project_id = v_pid ORDER BY position;
BEGIN
  SELECT id INTO v_pid FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_pid IS NULL THEN RETURN; END IF;

  -- Insert per-type screen config (upsert on conflict)
  FOR r IN (SELECT id, name FROM ph_work_types WHERE project_id = v_pid) LOOP
    DECLARE
      v_create TEXT; v_edit TEXT; v_view TEXT;
    BEGIN
      CASE r.name
        WHEN 'Story'               THEN v_create := 'SPN: Story Screen';          v_edit := 'SPN: Story Screen';          v_view := 'SPN: Story Screen';
        WHEN 'Epic'                THEN v_create := 'SPN: Epic Screen';            v_edit := 'SPN: Epic Screen';            v_view := 'SPN: Epic Screen';
        WHEN 'Feature'             THEN v_create := 'Feature';                     v_edit := 'Feature';                     v_view := 'Feature';
        WHEN 'Business Request'    THEN v_create := 'Change Request';              v_edit := 'Change Request';              v_view := 'Change Request';
        WHEN 'QA Bug'              THEN v_create := 'Revamp QA Bug Screen';        v_edit := 'Revamp QA Bug Screen';        v_view := 'Revamp QA Bug Screen';
        WHEN 'Production Incident' THEN v_create := 'Revamp production screen';    v_edit := 'Revamp production screen';    v_view := 'Revamp production screen';
        WHEN 'Change Request'      THEN v_create := 'SCN: Kanban Default Screen';  v_edit := 'SCN: Kanban Default Screen';  v_view := 'SCN: Kanban Default Screen';
        WHEN 'Business Gap'        THEN v_create := 'Change Request';              v_edit := 'Change Request';              v_view := 'Change Request';
        WHEN 'Sub-task'            THEN v_create := 'SCN: Kanban Default Screen';  v_edit := 'SCN: Kanban Default Screen';  v_view := 'SCN: Kanban Default Screen';
        ELSE                            v_create := 'Default Screen';              v_edit := 'Default Screen';              v_view := 'Default Screen';
      END CASE;

      INSERT INTO ph_screen_config (project_id, work_type_id, scheme_name, create_screen, edit_screen, view_screen)
      VALUES (v_pid, r.id, v_scheme, v_create, v_edit, v_view)
      ON CONFLICT (project_id, work_type_id) DO UPDATE SET
        scheme_name   = EXCLUDED.scheme_name,
        create_screen = EXCLUDED.create_screen,
        edit_screen   = EXCLUDED.edit_screen,
        view_screen   = EXCLUDED.view_screen;
    END;
  END LOOP;
END;
$$;

-- ─── 3. ph_field_layout — field visibility & order per work type ──────────────

CREATE TABLE IF NOT EXISTS ph_field_layout (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  work_type_id uuid        REFERENCES ph_work_types(id) ON DELETE CASCADE,
  field_key    TEXT        NOT NULL,
  field_label  TEXT        NOT NULL,
  section      TEXT        NOT NULL DEFAULT 'details',
  is_required  BOOLEAN     NOT NULL DEFAULT false,
  is_visible   BOOLEAN     NOT NULL DEFAULT true,
  position     INTEGER     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE ph_field_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_field_layout_select" ON ph_field_layout
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_field_layout.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "ph_field_layout_admin" ON ph_field_layout
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_field_layout.project_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ─── 4. ph_field_scheme — field configuration schemes (project-level) ─────────

CREATE TABLE IF NOT EXISTS ph_field_scheme (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  scheme_name TEXT        NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(project_id, scheme_name)
);

CREATE TABLE IF NOT EXISTS ph_field_config (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  field_scheme_id uuid        NOT NULL REFERENCES ph_field_scheme(id) ON DELETE CASCADE,
  config_name     TEXT        NOT NULL,
  work_type_names TEXT[]      NOT NULL DEFAULT '{}',
  is_default      BOOLEAN     NOT NULL DEFAULT false,
  project_count   INTEGER     NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ph_field_scheme ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_field_scheme_select" ON ph_field_scheme
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_field_scheme.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "ph_field_scheme_admin" ON ph_field_scheme
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ph_project_members
      WHERE project_id = ph_field_scheme.project_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "ph_field_config_select" ON ph_field_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ph_field_scheme fs
      JOIN ph_project_members pm ON pm.project_id = fs.project_id
      WHERE fs.id = ph_field_config.field_scheme_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "ph_field_config_admin" ON ph_field_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ph_field_scheme fs
      JOIN ph_project_members pm ON pm.project_id = fs.project_id
      WHERE fs.id = ph_field_config.field_scheme_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'owner')
    )
  );

-- Seed BAU field scheme (from Jira probe 2026-05-17: "Senaei 2.0 Field Scheme")
DO $$
DECLARE
  v_pid   uuid;
  v_sid   uuid;
BEGIN
  SELECT id INTO v_pid FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_pid IS NULL THEN RETURN; END IF;

  INSERT INTO ph_field_scheme (project_id, scheme_name)
  VALUES (v_pid, 'Senaei 2.0 Field Scheme')
  ON CONFLICT (project_id, scheme_name) DO NOTHING
  RETURNING id INTO v_sid;

  IF v_sid IS NULL THEN
    SELECT id INTO v_sid FROM ph_field_scheme WHERE project_id = v_pid AND scheme_name = 'Senaei 2.0 Field Scheme';
  END IF;

  -- Default Field Configuration — 12 work types, 50 projects
  INSERT INTO ph_field_config (field_scheme_id, config_name, work_type_names, is_default, project_count)
  VALUES (v_sid, 'Default Field Configuration',
          ARRAY['Epic','Feature','Business Request','QA Bug','Change Request','Business Gap','Sub-task'],
          true, 50)
  ON CONFLICT DO NOTHING;

  -- Senaei 2.0 Field Config — 2 work types: Story + Production Incident
  INSERT INTO ph_field_config (field_scheme_id, config_name, work_type_names, is_default, project_count)
  VALUES (v_sid, 'Senaei 2.0 Field Config',
          ARRAY['Story','Production Incident'],
          false, 1)
  ON CONFLICT DO NOTHING;
END;
$$;
