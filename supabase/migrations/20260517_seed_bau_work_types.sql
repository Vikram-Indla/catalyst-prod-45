-- Seed ph_work_types for the BAU project with the 9 Catalyst work types.
-- Uses WorkItemType registry keys in the `icon` column so TypeRow can pass
-- them directly to WorkItemTypeIcon without any mapping.
-- Level values: top | mid | work | child

DO $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT id INTO v_project_id FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_project_id IS NULL THEN
    RAISE NOTICE 'ph_projects: BAU not found — skipping seed';
    RETURN;
  END IF;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM ph_work_types WHERE project_id = v_project_id LIMIT 1) THEN
    RAISE NOTICE 'ph_work_types already seeded for BAU — skipping';
    RETURN;
  END IF;

  INSERT INTO ph_work_types (project_id, name, icon, color, level, is_enabled, position) VALUES
    (v_project_id, 'Epic',                 'epic',                 '#AF59E1', 'top',   true, 0),
    (v_project_id, 'Feature',              'feature',              '#36B37E', 'mid',   false, 1),
    (v_project_id, 'Business Request',     'business-request',     '#E2B203', 'work',  true, 2),
    (v_project_id, 'Story',                'story',                '#6A9A23', 'work',  true, 3),
    (v_project_id, 'QA Bug',               'qa-bug',               '#FF5630', 'work',  true, 4),
    (v_project_id, 'Production Incident',  'production-incident',  '#FF5630', 'work',  true, 5),
    (v_project_id, 'Change Request',       'change-request',       '#FFAB00', 'work',  true, 6),
    (v_project_id, 'Business Gap',         'business-gap',         '#FF5630', 'work',  true, 7),
    (v_project_id, 'Sub-task',             'sub-task',             '#1868DB', 'child', true, 8);

  RAISE NOTICE 'Seeded 9 work types for BAU (project_id: %)', v_project_id;
END;
$$;
