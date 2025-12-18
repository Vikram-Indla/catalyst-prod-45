
-- Seed Workbench Test Data - Projects, Epics, Features only (Stories skipped due to schema complexity)

-- 1) Projects (2)
INSERT INTO public.projects (id, name, key, program_id, status, created_at, updated_at)
VALUES 
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Licensing System', 'LIC', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'active', now(), now()),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Digital Identity Platform', 'DIP', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2) Epics (4)
INSERT INTO public.epics (id, name, epic_key, program_id, health, status, start_date, end_date, created_at, updated_at)
VALUES 
  ('e1e1e1e1-0001-4000-8000-000000000001', 'Epic name epic creation test', 'DTP-001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'green', 'proposed', NULL, NULL, now(), now()),
  ('e1e1e1e1-0002-4000-8000-000000000002', 'Platform Modernization', 'DTP-002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'green', 'in_progress', '2025-10-01', '2025-12-31', now(), now()),
  ('e1e1e1e1-0003-4000-8000-000000000003', 'API Gateway Implementation', 'DTP-003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'yellow', 'in_progress', '2025-11-01', '2026-01-31', now(), now()),
  ('e1e1e1e1-0004-4000-8000-000000000004', 'Data Analytics Dashboard', 'DTP-004', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'red', 'proposed', '2025-09-15', '2025-12-15', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3) Features (8)
INSERT INTO public.features (id, name, display_id, epic_id, project_id, health, status, planned_start_date, planned_end_date, progress_pct, created_at, updated_at)
VALUES 
  ('f1f1f1f1-0201-4000-8000-000000000001', 'Core Platform Upgrade', 'FEAT-201', 'e1e1e1e1-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'green', 'implementing', '2025-10-05', '2025-11-20', 60, now(), now()),
  ('f1f1f1f1-0202-4000-8000-000000000002', 'Infrastructure Hardening', 'FEAT-202', 'e1e1e1e1-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'green', 'backlog', '2025-11-15', '2025-12-20', 20, now(), now()),
  ('f1f1f1f1-0301-4000-8000-000000000003', 'Gateway Policy Engine', 'FEAT-301', 'e1e1e1e1-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'yellow', 'implementing', '2025-11-05', '2025-12-25', 50, now(), now()),
  ('f1f1f1f1-0302-4000-8000-000000000004', 'Rate Limiting & Throttling', 'FEAT-302', 'e1e1e1e1-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'yellow', 'backlog', '2025-12-01', '2026-01-15', 0, now(), now()),
  ('f1f1f1f1-0401-4000-8000-000000000005', 'BI Data Model', 'FEAT-401', 'e1e1e1e1-0004-4000-8000-000000000004', 'a1b2c3d4-0002-4000-8000-000000000002', 'red', 'implementing', '2025-09-20', '2025-11-15', 30, now(), now()),
  ('f1f1f1f1-0402-4000-8000-000000000006', 'Executive Dashboards', 'FEAT-402', 'e1e1e1e1-0004-4000-8000-000000000004', 'a1b2c3d4-0002-4000-8000-000000000002', 'red', 'backlog', '2025-11-16', '2025-12-15', 0, now(), now()),
  ('f1f1f1f1-0101-4000-8000-000000000007', 'Feature with no dates', 'FEAT-101', 'e1e1e1e1-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'green', 'backlog', NULL, NULL, 0, now(), now()),
  ('f1f1f1f1-0102-4000-8000-000000000008', 'Feature ends in next quarter', 'FEAT-102', 'e1e1e1e1-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'green', 'implementing', '2026-01-10', '2026-03-10', 45, now(), now())
ON CONFLICT (id) DO NOTHING;
