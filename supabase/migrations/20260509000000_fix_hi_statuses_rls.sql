-- Fix: hi_provision_project_defaults must run as the table owner (SECURITY DEFINER)
-- so it bypasses RLS when inserting default statuses into hi_statuses on project
-- creation. Without this, the trigger fires in the calling user's security context,
-- which has no INSERT policy on hi_statuses, causing:
--   "new row violates row-level security policy for table 'hi_statuses'"

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
