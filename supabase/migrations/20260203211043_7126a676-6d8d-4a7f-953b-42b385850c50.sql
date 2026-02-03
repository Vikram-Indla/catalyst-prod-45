-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK¹⁰ COMPLETE DATABASE — VERTICAL IMPLEMENTATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing views/functions
DROP VIEW IF EXISTS t10_list_cards CASCADE;
DROP VIEW IF EXISTS t10_completed_weeks CASCADE;
DROP VIEW IF EXISTS t10_week_items CASCADE;
DROP FUNCTION IF EXISTS t10_archive_list CASCADE;
DROP FUNCTION IF EXISTS t10_restore_list CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE ALTERATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add archive tracking to lists
ALTER TABLE t10_lists 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Add checkout tracking to weeks
ALTER TABLE t10_weeks 
  ADD COLUMN IF NOT EXISTS carried_forward_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dropped_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_by UUID REFERENCES auth.users(id);

-- Expand item status
ALTER TABLE t10_items DROP CONSTRAINT IF EXISTS t10_items_status_check;
ALTER TABLE t10_items ADD CONSTRAINT t10_items_status_check 
  CHECK (status IN ('todo', 'done', 'carried_forward', 'dropped'));
ALTER TABLE t10_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: t10_list_cards (Landing Page)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW t10_list_cards AS
SELECT 
  l.id,
  l.key,
  l.name,
  l.description,
  l.status,
  l.created_at,
  l.updated_at,
  l.created_by,
  l.archived_at,
  l.archived_by,
  
  -- Creator info
  p.full_name AS creator_name,
  p.avatar_url AS creator_avatar,
  
  -- Current week
  cw.id AS current_week_id,
  cw.week_start,
  cw.week_end,
  COALESCE(cw.total_count, 0) AS total_count,
  COALESCE(cw.completed_count, 0) AS completed_count,
  GREATEST(0, 10 - COALESCE(cw.total_count, 0)) AS slots_available,
  
  -- Progress percent
  CASE 
    WHEN COALESCE(cw.total_count, 0) > 0 
    THEN ROUND((cw.completed_count::DECIMAL / cw.total_count) * 100)
    ELSE 0 
  END AS completion_percent,
  
  -- Past weeks count
  (SELECT COUNT(*) FROM t10_weeks 
   WHERE list_id = l.id AND status = 'completed') AS past_weeks_count,
  
  -- Past weeks as JSON array
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', pw.id,
        'week_start', pw.week_start,
        'week_end', pw.week_end,
        'completed_count', pw.completed_count,
        'total_count', pw.total_count,
        'is_complete', pw.completed_count = pw.total_count
      ) ORDER BY pw.week_start DESC
    )
    FROM (
      SELECT id, week_start, week_end, completed_count, total_count
      FROM t10_weeks 
      WHERE list_id = l.id AND status = 'completed'
      ORDER BY week_start DESC
      LIMIT 10
    ) pw),
    '[]'::json
  ) AS past_weeks

FROM t10_lists l
LEFT JOIN profiles p ON l.created_by = p.id
LEFT JOIN t10_weeks cw ON cw.list_id = l.id AND cw.is_current = true
ORDER BY 
  CASE WHEN l.status = 'archived' THEN 1 ELSE 0 END,
  l.updated_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: t10_completed_weeks (Completed Tab)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW t10_completed_weeks AS
SELECT 
  w.id AS week_id,
  w.list_id,
  l.key AS list_key,
  l.name AS list_name,
  w.week_start,
  w.week_end,
  w.total_count,
  w.completed_count,
  w.carried_forward_count,
  w.dropped_count,
  w.checkout_at,
  w.checkout_by,
  p.full_name AS checkout_by_name,
  
  CASE 
    WHEN w.total_count > 0 
    THEN ROUND((w.completed_count::DECIMAL / w.total_count) * 100)
    ELSE 0 
  END AS completion_rate,
  
  CASE 
    WHEN w.completed_count = w.total_count THEN 'full'
    WHEN w.completed_count >= (w.total_count * 0.7) THEN 'partial'
    ELSE 'low'
  END AS status_badge

FROM t10_weeks w
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN profiles p ON w.checkout_by = p.id
WHERE w.status = 'completed'
ORDER BY w.checkout_at DESC NULLS LAST;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: t10_week_items (Detail Page)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW t10_week_items AS
SELECT 
  i.id,
  i.week_id,
  i.rank,
  i.title,
  i.description,
  i.status,
  i.taskhub_key,
  i.due_date,
  i.completed_at,
  i.carryover_count,
  i.is_buffer,
  i.assignee_id,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  w.week_start,
  w.week_end,
  l.id AS list_id,
  l.key AS list_key,
  l.name AS list_name,
  COALESCE(
    (SELECT json_agg(json_build_object('id', lb.id, 'name', lb.name, 'color', lb.color))
     FROM t10_item_labels il JOIN t10_labels lb ON il.label_id = lb.id
     WHERE il.item_id = i.id),
    '[]'::json
  ) AS labels
FROM t10_items i
JOIN t10_weeks w ON w.id = i.week_id
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN profiles p ON i.assignee_id = p.id
ORDER BY i.rank;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Archive List
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION t10_archive_list(p_list_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE t10_lists 
  SET status = 'archived', 
      archived_at = now(), 
      archived_by = auth.uid(),
      updated_at = now()
  WHERE id = p_list_id;
  
  RETURN json_build_object('success', true, 'list_id', p_list_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Restore List
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION t10_restore_list(p_list_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE t10_lists 
  SET status = 'active', 
      archived_at = NULL, 
      archived_by = NULL,
      updated_at = now()
  WHERE id = p_list_id;
  
  RETURN json_build_object('success', true, 'list_id', p_list_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Clear existing test data
DELETE FROM t10_item_labels WHERE item_id IN (SELECT id FROM t10_items WHERE week_id IN (SELECT id FROM t10_weeks WHERE list_id IN (SELECT id FROM t10_lists WHERE key LIKE 'T10-%')));
DELETE FROM t10_items WHERE week_id IN (SELECT id FROM t10_weeks WHERE list_id IN (SELECT id FROM t10_lists WHERE key LIKE 'T10-%'));
DELETE FROM t10_weeks WHERE list_id IN (SELECT id FROM t10_lists WHERE key LIKE 'T10-%');
DELETE FROM t10_lists WHERE key LIKE 'T10-%';

-- Insert Lists
INSERT INTO t10_lists (id, key, name, status, created_by, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'T10-001', 'Q1 Product Launch', 'active', (SELECT id FROM auth.users LIMIT 1), now() - interval '21 days'),
  ('a1000000-0000-0000-0000-000000000002', 'T10-002', 'Engineering Sprint Goals', 'active', (SELECT id FROM auth.users LIMIT 1), now() - interval '14 days'),
  ('a1000000-0000-0000-0000-000000000003', 'T10-003', 'Marketing Campaign', 'active', (SELECT id FROM auth.users LIMIT 1), now() - interval '1 day'),
  ('a1000000-0000-0000-0000-000000000004', 'T10-004', '2024 Annual Planning', 'inactive', (SELECT id FROM auth.users LIMIT 1), now() - interval '42 days'),
  ('a1000000-0000-0000-0000-000000000005', 'T10-005', 'Old Project', 'archived', (SELECT id FROM auth.users LIMIT 1), now() - interval '60 days');

UPDATE t10_lists SET archived_at = now() - interval '30 days', archived_by = (SELECT id FROM auth.users LIMIT 1) WHERE key = 'T10-005';

-- Insert Weeks for T10-001 (current + 3 past)
INSERT INTO t10_weeks (id, list_id, week_start, week_end, status, is_current, total_count, completed_count, carried_forward_count, checkout_at, checkout_by) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', date_trunc('week', now())::date, (date_trunc('week', now()) + interval '6 days')::date, 'active', true, 10, 6, 0, NULL, NULL),
  ('b1000001-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', (date_trunc('week', now()) - interval '7 days')::date, (date_trunc('week', now()) - interval '1 day')::date, 'completed', false, 10, 10, 0, now() - interval '7 days', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', (date_trunc('week', now()) - interval '14 days')::date, (date_trunc('week', now()) - interval '8 days')::date, 'completed', false, 10, 8, 2, now() - interval '14 days', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', (date_trunc('week', now()) - interval '21 days')::date, (date_trunc('week', now()) - interval '15 days')::date, 'completed', false, 10, 7, 3, now() - interval '21 days', (SELECT id FROM auth.users LIMIT 1));

-- Insert Weeks for T10-002 (current + 1 past, only 8 items = 2 slots)
INSERT INTO t10_weeks (id, list_id, week_start, week_end, status, is_current, total_count, completed_count, carried_forward_count, checkout_at, checkout_by) VALUES
  ('b1000002-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', date_trunc('week', now())::date, (date_trunc('week', now()) + interval '6 days')::date, 'active', true, 8, 3, 0, NULL, NULL),
  ('b1000002-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', (date_trunc('week', now()) - interval '7 days')::date, (date_trunc('week', now()) - interval '1 day')::date, 'completed', false, 10, 7, 3, now() - interval '7 days', (SELECT id FROM auth.users LIMIT 1));

-- Insert Weeks for T10-003 (current only, 100% complete)
INSERT INTO t10_weeks (id, list_id, week_start, week_end, status, is_current, total_count, completed_count) VALUES
  ('b1000003-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', date_trunc('week', now())::date, (date_trunc('week', now()) + interval '6 days')::date, 'active', true, 10, 10);

-- Insert Weeks for T10-004 (inactive, has past weeks)
INSERT INTO t10_weeks (id, list_id, week_start, week_end, status, is_current, total_count, completed_count, checkout_at, checkout_by) VALUES
  ('b1000004-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', (date_trunc('week', now()) - interval '28 days')::date, (date_trunc('week', now()) - interval '22 days')::date, 'active', true, 10, 4, NULL, NULL),
  ('b1000004-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', (date_trunc('week', now()) - interval '35 days')::date, (date_trunc('week', now()) - interval '29 days')::date, 'completed', false, 10, 10, now() - interval '35 days', (SELECT id FROM auth.users LIMIT 1));

-- Insert Items for T10-001 Current Week (6 done, 4 todo)
INSERT INTO t10_items (week_id, rank, title, status, taskhub_key, assignee_id, due_date, completed_at, created_by) VALUES
  ('b1000001-0000-0000-0000-000000000001', 1, 'Finalize API documentation', 'done', 'TH-101', (SELECT id FROM auth.users LIMIT 1), now()::date + 1, now() - interval '2 days', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 2, 'Complete user testing round 2', 'done', 'TH-102', (SELECT id FROM auth.users LIMIT 1), now()::date + 2, now() - interval '1 day', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 3, 'Review security audit report', 'done', 'TH-103', (SELECT id FROM auth.users LIMIT 1), now()::date + 2, now() - interval '1 day', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 4, 'Deploy staging environment', 'done', 'TH-104', (SELECT id FROM auth.users LIMIT 1), now()::date + 3, now(), (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 5, 'Update stakeholder deck', 'done', 'TH-105', (SELECT id FROM auth.users LIMIT 1), now()::date + 3, now(), (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 6, 'Configure monitoring alerts', 'done', NULL, (SELECT id FROM auth.users LIMIT 1), now()::date + 4, now(), (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 7, 'Run load testing suite', 'todo', 'TH-107', (SELECT id FROM auth.users LIMIT 1), now()::date + 5, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 8, 'Document rollback procedures', 'todo', 'TH-108', (SELECT id FROM auth.users LIMIT 1), now()::date + 5, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 9, 'Final QA sign-off', 'todo', 'TH-109', (SELECT id FROM auth.users LIMIT 1), now()::date + 6, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000001-0000-0000-0000-000000000001', 10, 'Production deployment', 'todo', 'TH-110', (SELECT id FROM auth.users LIMIT 1), now()::date + 7, NULL, (SELECT id FROM auth.users LIMIT 1));

-- Insert Items for T10-002 (8 items, 3 done)
INSERT INTO t10_items (week_id, rank, title, status, taskhub_key, assignee_id, due_date, completed_at, created_by) VALUES
  ('b1000002-0000-0000-0000-000000000001', 1, 'Fix authentication bug', 'done', 'ENG-201', (SELECT id FROM auth.users LIMIT 1), now()::date + 1, now() - interval '1 day', (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 2, 'Implement caching layer', 'done', 'ENG-202', (SELECT id FROM auth.users LIMIT 1), now()::date + 2, now(), (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 3, 'Database migration', 'done', 'ENG-203', (SELECT id FROM auth.users LIMIT 1), now()::date + 2, now(), (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 4, 'API rate limiting', 'todo', 'ENG-204', (SELECT id FROM auth.users LIMIT 1), now()::date + 3, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 5, 'Logging improvements', 'todo', 'ENG-205', (SELECT id FROM auth.users LIMIT 1), now()::date + 4, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 6, 'Error handling refactor', 'todo', 'ENG-206', (SELECT id FROM auth.users LIMIT 1), now()::date + 5, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 7, 'Unit test coverage', 'todo', 'ENG-207', (SELECT id FROM auth.users LIMIT 1), now()::date + 6, NULL, (SELECT id FROM auth.users LIMIT 1)),
  ('b1000002-0000-0000-0000-000000000001', 8, 'Code review backlog', 'todo', 'ENG-208', (SELECT id FROM auth.users LIMIT 1), now()::date + 7, NULL, (SELECT id FROM auth.users LIMIT 1));

-- Insert Items for T10-003 (10/10 done)
INSERT INTO t10_items (week_id, rank, title, status, completed_at, created_by)
SELECT 'b1000003-0000-0000-0000-000000000001', n, 'Marketing Task ' || n, 'done', now() - interval '1 day', (SELECT id FROM auth.users LIMIT 1)
FROM generate_series(1, 10) AS n;