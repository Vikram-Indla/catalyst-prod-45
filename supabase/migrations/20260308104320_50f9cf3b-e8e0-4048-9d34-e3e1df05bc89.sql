
-- Change status_ids from uuid[] to text[]
ALTER TABLE board_columns ALTER COLUMN status_ids TYPE text[] USING status_ids::text[];

-- Seed data for Lovable-specific project (skip if project doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = 'a059622c-ca4a-4d2b-b272-e440f349240e') THEN
    RAISE NOTICE 'Project a059622c not found, skipping board seed data';
    RETURN;
  END IF;

  -- Soft-delete placeholder boards
  UPDATE boards SET deleted_at = NOW()
  WHERE project_id = 'a059622c-ca4a-4d2b-b272-e440f349240e'
    AND id IN ('b0000001-0000-0000-0000-000000000001','b0000002-0000-0000-0000-000000000002','b0000003-0000-0000-0000-000000000003','b0000004-0000-0000-0000-000000000004');

  -- Create the two real Jira boards
  INSERT INTO boards (id, name, description, project_id, board_type, created_by, jira_project_key, jira_sync_enabled, color, icon, sort_order, visibility)
  VALUES
    ('da000001-0000-0000-0000-000000000001', 'Demand Analysis Kanban', 'Jira board for demand analysis workflow', 'a059622c-ca4a-4d2b-b272-e440f349240e', 'kanban', 'bd74d5ba-90a2-4a1c-8290-6539151e2e62', 'MDT', true, '#2563EB', '📋', 0, 'team'),
    ('da000002-0000-0000-0000-000000000002', 'Business Request Kanban', 'Jira board for business request workflow', 'a059622c-ca4a-4d2b-b272-e440f349240e', 'kanban', 'bd74d5ba-90a2-4a1c-8290-6539151e2e62', 'MDT', true, '#D97706', '📊', 1, 'team')
  ON CONFLICT DO NOTHING;

  -- Columns for Demand Analysis Kanban
  INSERT INTO board_columns (board_id, name, position, jira_mapped, status_ids, is_backlog, is_done) VALUES
    ('da000001-0000-0000-0000-000000000001', 'BRD Backlog', 0, true, ARRAY['BRD Backlog']::text[], true, false),
    ('da000001-0000-0000-0000-000000000001', 'BRD Preparation', 1, true, ARRAY['BRD Preparation']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'BRD Under Review', 2, true, ARRAY['BRD Under Review']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'Blocked', 3, true, ARRAY['Blocked']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'UI Design', 4, true, ARRAY['Figma Design']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'BRD Sign Off', 5, true, ARRAY['BRD Sign Off']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'Technical Validation', 6, true, ARRAY['Technical validation']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'Ready for Implementation', 7, true, ARRAY['Ready for implementation']::text[], false, false),
    ('da000001-0000-0000-0000-000000000001', 'Done', 8, true, ARRAY['Done','Canceled']::text[], false, true)
  ON CONFLICT DO NOTHING;

  -- Columns for Business Request Kanban
  INSERT INTO board_columns (board_id, name, position, jira_mapped, status_ids, is_backlog, is_done) VALUES
    ('da000002-0000-0000-0000-000000000002', 'New Demand', 0, true, ARRAY['New']::text[], true, false),
    ('da000002-0000-0000-0000-000000000002', 'Ready for Analysis', 1, true, ARRAY['Ready for Development']::text[], false, false),
    ('da000002-0000-0000-0000-000000000002', 'Ready for Implementation', 2, true, ARRAY['Ready for implementation']::text[], false, false),
    ('da000002-0000-0000-0000-000000000002', 'Under Implementation', 3, true, ARRAY['Under Implementation','In Progress']::text[], false, false),
    ('da000002-0000-0000-0000-000000000002', 'Business Verification', 4, true, ARRAY['Implementation Review']::text[], false, false),
    ('da000002-0000-0000-0000-000000000002', 'Done', 5, true, ARRAY['Done','Canceled']::text[], false, true),
    ('da000002-0000-0000-0000-000000000002', 'Follow Up', 6, true, ARRAY['In Support','On Hold']::text[], false, false)
  ON CONFLICT DO NOTHING;

  -- Populate board_issue_rank for Demand Analysis Kanban
  INSERT INTO board_issue_rank (board_id, work_item_id, column_id, rank_value)
  SELECT
    'da000001-0000-0000-0000-000000000001'::uuid,
    i.id,
    bc.id,
    LPAD(ROW_NUMBER() OVER (PARTITION BY bc.id ORDER BY i.jira_updated_at DESC)::text, 10, '0')
  FROM ph_issues i
  JOIN board_columns bc ON bc.board_id = 'da000001-0000-0000-0000-000000000001'
    AND i.status = ANY(bc.status_ids)
  WHERE i.project_key = 'MDT'
  ON CONFLICT DO NOTHING;

  -- Populate board_issue_rank for Business Request Kanban
  INSERT INTO board_issue_rank (board_id, work_item_id, column_id, rank_value)
  SELECT
    'da000002-0000-0000-0000-000000000002'::uuid,
    i.id,
    bc.id,
    LPAD(ROW_NUMBER() OVER (PARTITION BY bc.id ORDER BY i.jira_updated_at DESC)::text, 10, '0')
  FROM ph_issues i
  JOIN board_columns bc ON bc.board_id = 'da000002-0000-0000-0000-000000000002'
    AND i.status = ANY(bc.status_ids)
  WHERE i.project_key = 'MDT'
  ON CONFLICT DO NOTHING;

END $$;
