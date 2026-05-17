-- Seed ph_workflow_statuses for BAU with the 27 live Jira statuses.
-- Categories use the ph_workflow_statuses check constraint values:
--   todo | in_progress | done | terminal
-- Colors: todo=#64748B grey, in_progress=#2563EB blue, done=#16A34A green,
--         terminal=#DC2626 red

DO $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT id INTO v_project_id FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_project_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM ph_workflow_statuses WHERE project_id = v_project_id LIMIT 1) THEN RETURN; END IF;

  INSERT INTO ph_workflow_statuses (project_id, name, color, category, position, is_default) VALUES
    (v_project_id, 'In Requirements',     '#64748B', 'todo',        0,  true),
    (v_project_id, 'ToDo',                '#64748B', 'todo',        1,  false),
    (v_project_id, 'Backlog',             '#64748B', 'todo',        2,  false),
    (v_project_id, 'Prioritized Backlog', '#64748B', 'todo',        3,  false),
    (v_project_id, 'In Design',           '#64748B', 'todo',        4,  false),
    (v_project_id, 'Blocked',             '#64748B', 'todo',        5,  false),
    (v_project_id, 'In Progress',         '#2563EB', 'in_progress', 6,  true),
    (v_project_id, 'In Development',      '#2563EB', 'in_progress', 7,  false),
    (v_project_id, 'Re-Open',             '#2563EB', 'in_progress', 8,  false),
    (v_project_id, 'Implementation',      '#2563EB', 'in_progress', 9,  false),
    (v_project_id, 'Internal QA',         '#2563EB', 'in_progress', 10, false),
    (v_project_id, 'In Integration',      '#2563EB', 'in_progress', 11, false),
    (v_project_id, 'Done',                '#16A34A', 'done',        12, true),
    (v_project_id, 'Ready for QA',        '#16A34A', 'done',        13, false),
    (v_project_id, 'Closed',              '#16A34A', 'done',        14, false),
    (v_project_id, 'In QA',               '#16A34A', 'done',        15, false),
    (v_project_id, 'Awaiting Info',       '#64748B', 'done',        16, false),
    (v_project_id, 'UAT Ready',           '#16A34A', 'done',        17, false),
    (v_project_id, 'BETA READY',          '#16A34A', 'done',        18, false),
    (v_project_id, 'In Production',       '#16A34A', 'done',        19, false),
    (v_project_id, 'In UAT',              '#16A34A', 'done',        20, false),
    (v_project_id, 'Ready for production','#16A34A', 'done',        21, false),
    (v_project_id, 'Retest',              '#2563EB', 'done',        22, false),
    (v_project_id, 'In BETA',             '#16A34A', 'done',        23, false),
    (v_project_id, 'Resolved',            '#16A34A', 'done',        24, false),
    (v_project_id, 'Staging/QA',          '#16A34A', 'done',        25, false),
    (v_project_id, 'Rejected',            '#DC2626', 'terminal',    26, false);
END;
$$;
