
-- Auto-provision hi_statuses + hi_project_sequences for every new project
CREATE OR REPLACE FUNCTION hi_provision_project_defaults()
RETURNS trigger AS $$
BEGIN
  INSERT INTO hi_statuses (name, color, color_text, is_default, is_terminal, sort_order, project_id)
  VALUES
    ('Backlog',     '#64748B', '#475569', true,  false, 1, NEW.id),
    ('To Do',       '#2563EB', '#1D4ED8', false, false, 2, NEW.id),
    ('In Progress', '#0D9488', '#0A8277', false, false, 3, NEW.id),
    ('In Review',   '#D97706', '#AF6003', false, false, 4, NEW.id),
    ('Done',        '#16A34A', '#11853D', false, true,  5, NEW.id),
    ('Blocked',     '#DC2626', '#D92525', false, false, 6, NEW.id);

  INSERT INTO hi_project_sequences (project_id, last_number)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hi_provision_project ON projects;
CREATE TRIGGER trg_hi_provision_project
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION hi_provision_project_defaults();
