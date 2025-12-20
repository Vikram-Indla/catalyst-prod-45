-- ============================================================================
-- INCIDENT REPORTS SEED DATA
-- ============================================================================
-- Comprehensive seed data for all incident reports (42 incidents)
-- Covers:
-- - SLA Breaches (6 breached, 4 at-risk)
-- - Aging (mix of ages from 1h to 21 days)
-- - Committee states (6 total: 4 pending, 1 vetoed, 1 approved)
-- - Conversions (18 converted, 24 not converted)
-- - Severity vs Priority mismatches (6+ mismatches, 4+ aligned)

-- First, ensure we have user profiles
INSERT INTO incident_user_profiles (id, full_name, email, avatar_url, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sarah Chen', 'sarah.chen@example.com', NULL, true),
  ('22222222-2222-2222-2222-222222222222', 'Michael Torres', 'michael.torres@example.com', NULL, true),
  ('33333333-3333-3333-3333-333333333333', 'Emily Watson', 'emily.watson@example.com', NULL, true),
  ('44444444-4444-4444-4444-444444444444', 'David Kim', 'david.kim@example.com', NULL, true),
  ('55555555-5555-5555-5555-555555555555', 'Lisa Anderson', 'lisa.anderson@example.com', NULL, true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Ensure we have release versions
INSERT INTO release_versions (id, version, name, release_date, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v2.4.0', 'Phoenix Release', '2025-01-15', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'v2.3.1', 'Hotfix Release', '2025-01-01', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'v2.3.0', 'Dragon Release', '2024-12-15', 'released')
ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version;

-- Delete existing seeded incidents to avoid duplicates
DELETE FROM incidents WHERE incident_key LIKE 'INC-%' AND id IN (
  SELECT id FROM incidents ORDER BY created_at DESC LIMIT 100
);

-- ============================================================================
-- INCIDENTS DATA (42 total)
-- ============================================================================

-- SEV1 incidents (8 total) - Critical priority issues
INSERT INTO incidents (
  id, incident_key, title, description, severity, priority, status, 
  support_level, is_major_incident, assignee_id, reporter_id, 
  release_version_id, created_at, updated_at
) VALUES
  -- SEV1 #1: Breached SLA, 14 days old, converted to epic
  ('inc-00001-0000-0000-0000-000000000001', 'INC-001', 
   'Production database cluster failure causing 502 errors', 
   'Critical database outage affecting all users. Primary cluster unresponsive.', 
   'SEV1', 'P1', 'in_progress', 'L3', true, 
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '14 days', NOW()),
   
  -- SEV1 #2: Breached SLA, 6 hours old, pending committee
  ('inc-00002-0000-0000-0000-000000000002', 'INC-002', 
   'Payment gateway timeout causing transaction failures', 
   'Stripe integration timing out on 40% of transactions.', 
   'SEV1', 'P1', 'to_committee', 'L3', true, 
   '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '6 hours', NOW()),
   
  -- SEV1 #3: At-risk SLA, 2 hours old
  ('inc-00003-0000-0000-0000-000000000003', 'INC-003', 
   'Authentication service returning 500 errors', 
   'Login failures affecting 30% of users attempting to sign in.', 
   'SEV1', 'P1', 'triage', 'L2', true, 
   '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '2 hours', NOW()),
   
  -- SEV1 #4: Mismatch - SEV1 but P3 priority (triage issue)
  ('inc-00004-0000-0000-0000-000000000004', 'INC-004', 
   'CDN serving stale content for critical assets', 
   'Users seeing outdated JavaScript bundles causing app crashes.', 
   'SEV1', 'P3', 'open', 'L2', false, 
   '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '1 day', NOW()),
   
  -- SEV1 #5: Converted to feature, resolved
  ('inc-00005-0000-0000-0000-000000000005', 'INC-005', 
   'Memory leak in worker process causing crashes', 
   'Node.js workers running out of heap memory after 2 hours.', 
   'SEV1', 'P1', 'converted', 'L3', true, 
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day'),
   
  -- SEV1 #6: Mismatch - SEV1 but P4 priority
  ('inc-00006-0000-0000-0000-000000000006', 'INC-006', 
   'SSL certificate expiration imminent', 
   'Production SSL cert expires in 48 hours. Auto-renewal failed.', 
   'SEV1', 'P4', 'open', 'L1', false, 
   NULL, '44444444-4444-4444-4444-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '3 days', NOW()),
   
  -- SEV1 #7: Resolved, was committee approved
  ('inc-00007-0000-0000-0000-000000000007', 'INC-007', 
   'Data corruption in user preferences table', 
   'Migration script corrupted 5000 user preference records.', 
   'SEV1', 'P1', 'resolved', 'L3', true, 
   '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
   
  -- SEV1 #8: Pending committee, 4 days old
  ('inc-00008-0000-0000-0000-000000000008', 'INC-008', 
   'Kubernetes pod scaling not responding to load', 
   'HPA metrics adapter disconnected. Pods not auto-scaling.', 
   'SEV1', 'P1', 'to_committee', 'L3', true, 
   '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '4 days', NOW());

-- SEV2 incidents (12 total)
INSERT INTO incidents (
  id, incident_key, title, description, severity, priority, status, 
  support_level, is_major_incident, assignee_id, reporter_id, 
  release_version_id, created_at, updated_at,
  converted_to_type, converted_to_id, converted_at
) VALUES
  -- SEV2 #1: Breached, 10 days old
  ('inc-00009-0000-0000-0000-000000000009', 'INC-009', 
   'Search functionality returning incomplete results', 
   'Elasticsearch cluster missing shards. 20% of documents not indexed.', 
   'SEV2', 'P2', 'in_progress', 'L2', false, 
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '10 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #2: At-risk, converted to story
  ('inc-00010-0000-0000-0000-000000000010', 'INC-010', 
   'Report generation timeout for large datasets', 
   'PDF reports failing for datasets over 10,000 rows.', 
   'SEV2', 'P2', 'converted', 'L2', false, 
   '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days',
   'story', 'story-001', NOW() - INTERVAL '2 days'),
   
  -- SEV2 #3: Mismatch - SEV2 but P4
  ('inc-00011-0000-0000-0000-000000000011', 'INC-011', 
   'Email notification delays up to 30 minutes', 
   'SQS queue backlog causing significant email delays.', 
   'SEV2', 'P4', 'triage', 'L1', false, 
   NULL, '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '3 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #4: Resolved, converted to feature
  ('inc-00012-0000-0000-0000-000000000012', 'INC-012', 
   'Dashboard charts not rendering on Safari', 
   'Chart.js incompatibility with Safari 16.4+.', 
   'SEV2', 'P2', 'converted', 'L2', false, 
   '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days',
   'feature', 'feat-001', NOW() - INTERVAL '6 days'),
   
  -- SEV2 #5: Pending committee
  ('inc-00013-0000-0000-0000-000000000013', 'INC-013', 
   'API rate limiting not enforced correctly', 
   'Rate limiter Redis connection intermittently failing.', 
   'SEV2', 'P2', 'to_committee', 'L3', false, 
   '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '2 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #6: Closed, converted to epic
  ('inc-00014-0000-0000-0000-000000000014', 'INC-014', 
   'File upload size limit not enforced on mobile', 
   'Mobile app bypassing server-side validation.', 
   'SEV2', 'P2', 'closed', 'L2', false, 
   '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days',
   'epic', 'epic-001', NOW() - INTERVAL '8 days'),
   
  -- SEV2 #7: In progress, 5 days old
  ('inc-00015-0000-0000-0000-000000000015', 'INC-015', 
   'WebSocket connections dropping after 5 minutes', 
   'Load balancer timeout too aggressive for real-time features.', 
   'SEV2', 'P2', 'in_progress', 'L2', false, 
   '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '5 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #8: Breached, 9 days old
  ('inc-00016-0000-0000-0000-000000000016', 'INC-016', 
   'Backup jobs failing silently', 
   'Nightly database backups not completing. No alerts triggered.', 
   'SEV2', 'P2', 'in_progress', 'L3', false, 
   '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '9 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #9: Open, 1 day old
  ('inc-00017-0000-0000-0000-000000000017', 'INC-017', 
   'GraphQL mutations occasionally returning null', 
   'Race condition in resolver causing data loss.', 
   'SEV2', 'P2', 'open', 'L2', false, 
   NULL, '44444444-4444-4444-4444-444444444444',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '1 day', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #10: Converted to story, closed
  ('inc-00018-0000-0000-0000-000000000018', 'INC-018', 
   'Audit log missing user agent information', 
   'Security compliance gap in audit trail.', 
   'SEV2', 'P2', 'closed', 'L1', false, 
   '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days',
   'story', 'story-002', NOW() - INTERVAL '14 days'),
   
  -- SEV2 #11: At risk, 4 days old
  ('inc-00019-0000-0000-0000-000000000019', 'INC-019', 
   'Session tokens not invalidating on password change', 
   'Security vulnerability allowing old sessions to persist.', 
   'SEV2', 'P2', 'in_progress', 'L3', false, 
   '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '4 days', NOW(), NULL, NULL, NULL),
   
  -- SEV2 #12: Vetoed by committee
  ('inc-00020-0000-0000-0000-000000000020', 'INC-020', 
   'Proposed architecture change for caching layer', 
   'Redis to Memcached migration proposal.', 
   'SEV2', 'P2', 'closed', 'L2', false, 
   '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NULL, NULL, NULL);

-- SEV3 incidents (14 total)
INSERT INTO incidents (
  id, incident_key, title, description, severity, priority, status, 
  support_level, is_major_incident, assignee_id, reporter_id, 
  release_version_id, created_at, updated_at,
  converted_to_type, converted_to_id, converted_at
) VALUES
  -- SEV3 #1-14
  ('inc-00021-0000-0000-0000-000000000021', 'INC-021', 
   'Tooltip positioning incorrect on small screens', 
   'UI glitch affecting mobile users.', 
   'SEV3', 'P3', 'open', 'L1', false, 
   '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '2 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00022-0000-0000-0000-000000000022', 'INC-022', 
   'Date picker showing wrong timezone', 
   'Users in EST seeing UTC times.', 
   'SEV3', 'P3', 'in_progress', 'L1', false, 
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '8 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00023-0000-0000-0000-000000000023', 'INC-023', 
   'Export CSV missing header row', 
   'Downloaded files lack column headers.', 
   'SEV3', 'P3', 'converted', 'L1', false, 
   '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '5 days',
   'story', 'story-003', NOW() - INTERVAL '5 days'),
   
  ('inc-00024-0000-0000-0000-000000000024', 'INC-024', 
   'Avatar images not loading for new users', 
   'Gravatar fallback broken.', 
   'SEV3', 'P3', 'resolved', 'L1', false, 
   '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NULL, NULL, NULL),
   
  ('inc-00025-0000-0000-0000-000000000025', 'INC-025', 
   'Keyboard shortcuts not working in modal dialogs', 
   'Focus trap preventing shortcut propagation.', 
   'SEV3', 'P3', 'open', 'L1', false, 
   NULL, '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '3 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00026-0000-0000-0000-000000000026', 'INC-026', 
   'Print stylesheet missing pagination', 
   'Multi-page reports printing incorrectly.', 
   'SEV3', 'P3', 'converted', 'L1', false, 
   '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days',
   'feature', 'feat-002', NOW() - INTERVAL '7 days'),
   
  ('inc-00027-0000-0000-0000-000000000027', 'INC-027', 
   'Notification bell not updating count in real-time', 
   'Requires page refresh to see new notifications.', 
   'SEV3', 'P3', 'in_progress', 'L1', false, 
   '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '4 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00028-0000-0000-0000-000000000028', 'INC-028', 
   'Dark mode toggle state not persisting', 
   'Theme resets on browser refresh.', 
   'SEV3', 'P3', 'converted', 'L1', false, 
   '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days',
   'story', 'story-004', NOW() - INTERVAL '10 days'),
   
  ('inc-00029-0000-0000-0000-000000000029', 'INC-029', 
   'Autocomplete dropdown z-index conflict', 
   'Dropdown appearing behind other UI elements.', 
   'SEV3', 'P3', 'triage', 'L1', false, 
   NULL, '55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '1 day', NOW(), NULL, NULL, NULL),
   
  ('inc-00030-0000-0000-0000-000000000030', 'INC-030', 
   'Breadcrumb navigation broken after deep linking', 
   'Direct URL access shows incorrect path.', 
   'SEV3', 'P3', 'closed', 'L1', false, 
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '15 days', NULL, NULL, NULL),
   
  ('inc-00031-0000-0000-0000-000000000031', 'INC-031', 
   'Mismatch - SEV3 with P1 priority', 
   'Over-prioritized minor UI issue.', 
   'SEV3', 'P1', 'open', 'L1', false, 
   '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '2 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00032-0000-0000-0000-000000000032', 'INC-032', 
   'Filter chips not clearing properly', 
   'Reset button leaves residual filter state.', 
   'SEV3', 'P3', 'converted', 'L1', false, 
   '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days',
   'story', 'story-005', NOW() - INTERVAL '4 days'),
   
  ('inc-00033-0000-0000-0000-000000000033', 'INC-033', 
   'Table sort indicator missing on mobile', 
   'No visual feedback for sorted columns.', 
   'SEV3', 'P3', 'in_progress', 'L1', false, 
   '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '6 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00034-0000-0000-0000-000000000034', 'INC-034', 
   'Drag and drop preview offset incorrect', 
   'Ghost image not aligned with cursor.', 
   'SEV3', 'P3', 'converted', 'L1', false, 
   '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '9 days',
   'story', 'story-006', NOW() - INTERVAL '9 days');

-- SEV4 incidents (8 total)
INSERT INTO incidents (
  id, incident_key, title, description, severity, priority, status, 
  support_level, is_major_incident, assignee_id, reporter_id, 
  release_version_id, created_at, updated_at,
  converted_to_type, converted_to_id, converted_at
) VALUES
  ('inc-00035-0000-0000-0000-000000000035', 'INC-035', 
   'Typo in error message', 
   'Says "occured" instead of "occurred".', 
   'SEV4', 'P4', 'closed', 'L1', false, 
   '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NULL, NULL, NULL),
   
  ('inc-00036-0000-0000-0000-000000000036', 'INC-036', 
   'Icon color slightly off in dark mode', 
   'Icon appears gray instead of white.', 
   'SEV4', 'P4', 'open', 'L1', false, 
   NULL, '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '5 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00037-0000-0000-0000-000000000037', 'INC-037', 
   'Footer copyright year needs update', 
   '2024 should be 2025.', 
   'SEV4', 'P4', 'converted', 'L1', false, 
   '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
   'story', 'story-007', NOW() - INTERVAL '6 days'),
   
  ('inc-00038-0000-0000-0000-000000000038', 'INC-038', 
   'Double scrollbar appearing on Windows', 
   'Browser and content scrollbar both visible.', 
   'SEV4', 'P4', 'in_progress', 'L1', false, 
   '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '3 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00039-0000-0000-0000-000000000039', 'INC-039', 
   'Placeholder text inconsistent capitalization', 
   'Some fields use sentence case, others title case.', 
   'SEV4', 'P4', 'triage', 'L1', false, 
   NULL, '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '1 day', NOW(), NULL, NULL, NULL),
   
  ('inc-00040-0000-0000-0000-000000000040', 'INC-040', 
   'Favicon not updating after rebrand', 
   'Old logo still showing in browser tab.', 
   'SEV4', 'P4', 'converted', 'L1', false, 
   '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days',
   'story', 'story-008', NOW() - INTERVAL '11 days'),
   
  ('inc-00041-0000-0000-0000-000000000041', 'INC-041', 
   'Mismatch - SEV4 with P1 priority', 
   'Severely over-prioritized cosmetic issue.', 
   'SEV4', 'P1', 'open', 'L1', false, 
   '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   NOW() - INTERVAL '4 days', NOW(), NULL, NULL, NULL),
   
  ('inc-00042-0000-0000-0000-000000000042', 'INC-042', 
   'Help tooltip text too small on high DPI screens', 
   'Font-size not scaling with display settings.', 
   'SEV4', 'P4', 'closed', 'L1', false, 
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '14 days', NULL, NULL, NULL);

-- ============================================================================
-- SLA RECORDS (Breaches and At-Risk)
-- ============================================================================
-- 6 breached (2 SEV1), 4 at-risk

-- Breached SLA records
INSERT INTO sla_records (id, incident_id, response_due_at, resolution_due_at, response_met_at, resolution_met_at, response_breached, resolution_breached)
SELECT 
  gen_random_uuid(),
  id,
  created_at + INTERVAL '30 minutes', -- Response due
  created_at + INTERVAL '4 hours', -- Resolution due
  NULL, -- Not met
  NULL, -- Not met
  true, -- Response breached
  true  -- Resolution breached
FROM incidents 
WHERE incident_key IN ('INC-001', 'INC-002', 'INC-009', 'INC-016', 'INC-022', 'INC-015');

-- At-risk SLA records (close to breach)
INSERT INTO sla_records (id, incident_id, response_due_at, resolution_due_at, response_met_at, resolution_met_at, response_breached, resolution_breached)
SELECT 
  gen_random_uuid(),
  id,
  NOW() + INTERVAL '1 hour', -- Response due soon
  NOW() + INTERVAL '2 hours', -- Resolution due soon
  created_at + INTERVAL '10 minutes', -- Response met quickly
  NULL, -- Not yet met
  false, -- Response not breached
  false  -- Resolution not breached yet
FROM incidents 
WHERE incident_key IN ('INC-003', 'INC-017', 'INC-019', 'INC-027');

-- On-track SLA records (healthy)
INSERT INTO sla_records (id, incident_id, response_due_at, resolution_due_at, response_met_at, resolution_met_at, response_breached, resolution_breached)
SELECT 
  gen_random_uuid(),
  id,
  created_at + INTERVAL '2 hours',
  created_at + INTERVAL '24 hours',
  created_at + INTERVAL '30 minutes',
  CASE WHEN status IN ('resolved', 'closed') THEN updated_at ELSE NULL END,
  false,
  false
FROM incidents 
WHERE incident_key NOT IN ('INC-001', 'INC-002', 'INC-009', 'INC-016', 'INC-022', 'INC-015', 'INC-003', 'INC-017', 'INC-019', 'INC-027');

-- ============================================================================
-- COMMITTEE DATA (6 incidents with committee involvement)
-- ============================================================================

-- Committee 1: Pending (INC-002) - SEV1, 2 of 5 approvals
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at)
VALUES ('comm-0001-0000-0000-0000-000000000001', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-002'), 
        'pending', 5, NOW() - INTERVAL '5 hours');

UPDATE incidents SET committee_id = 'comm-0001-0000-0000-0000-000000000001' 
WHERE incident_key = 'INC-002';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0001-0000-0000-0000-000000000001', 'comm-0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', false, 'reviewer'),
  ('cmem-0002-0000-0000-0000-000000000002', 'comm-0001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', false, 'reviewer'),
  ('cmem-0003-0000-0000-0000-000000000003', 'comm-0001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', true, 'chair'),
  ('cmem-0004-0000-0000-0000-000000000004', 'comm-0001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', false, 'reviewer'),
  ('cmem-0005-0000-0000-0000-000000000005', 'comm-0001-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0001-0000-0000-0000-000000000001', 'cmem-0001-0000-0000-0000-000000000001', 'approved', NOW() - INTERVAL '4 hours', 'Looks good to proceed'),
  ('comm-0001-0000-0000-0000-000000000001', 'cmem-0002-0000-0000-0000-000000000002', 'approved', NOW() - INTERVAL '3 hours', 'Approved with minor concerns'),
  ('comm-0001-0000-0000-0000-000000000001', 'cmem-0003-0000-0000-0000-000000000003', 'pending', NULL, NULL),
  ('comm-0001-0000-0000-0000-000000000001', 'cmem-0004-0000-0000-0000-000000000004', 'pending', NULL, NULL),
  ('comm-0001-0000-0000-0000-000000000001', 'cmem-0005-0000-0000-0000-000000000005', 'pending', NULL, NULL);

-- Committee 2: Pending (INC-008) - SEV1, 4 days old, 1 of 3 approvals
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at)
VALUES ('comm-0002-0000-0000-0000-000000000002', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-008'), 
        'pending', 3, NOW() - INTERVAL '4 days');

UPDATE incidents SET committee_id = 'comm-0002-0000-0000-0000-000000000002' 
WHERE incident_key = 'INC-008';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0006-0000-0000-0000-000000000006', 'comm-0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', true, 'chair'),
  ('cmem-0007-0000-0000-0000-000000000007', 'comm-0002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', false, 'reviewer'),
  ('cmem-0008-0000-0000-0000-000000000008', 'comm-0002-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0002-0000-0000-0000-000000000002', 'cmem-0006-0000-0000-0000-000000000006', 'approved', NOW() - INTERVAL '3 days', 'Critical issue, needs immediate action'),
  ('comm-0002-0000-0000-0000-000000000002', 'cmem-0007-0000-0000-0000-000000000007', 'pending', NULL, NULL),
  ('comm-0002-0000-0000-0000-000000000002', 'cmem-0008-0000-0000-0000-000000000008', 'pending', NULL, NULL);

-- Committee 3: Pending (INC-013) - SEV2, 0 of 4 approvals
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at)
VALUES ('comm-0003-0000-0000-0000-000000000003', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-013'), 
        'pending', 4, NOW() - INTERVAL '1 day');

UPDATE incidents SET committee_id = 'comm-0003-0000-0000-0000-000000000003' 
WHERE incident_key = 'INC-013';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0009-0000-0000-0000-000000000009', 'comm-0003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', false, 'reviewer'),
  ('cmem-0010-0000-0000-0000-000000000010', 'comm-0003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', false, 'reviewer'),
  ('cmem-0011-0000-0000-0000-000000000011', 'comm-0003-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', true, 'chair'),
  ('cmem-0012-0000-0000-0000-000000000012', 'comm-0003-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0003-0000-0000-0000-000000000003', 'cmem-0009-0000-0000-0000-000000000009', 'pending', NULL, NULL),
  ('comm-0003-0000-0000-0000-000000000003', 'cmem-0010-0000-0000-0000-000000000010', 'pending', NULL, NULL),
  ('comm-0003-0000-0000-0000-000000000003', 'cmem-0011-0000-0000-0000-000000000011', 'pending', NULL, NULL),
  ('comm-0003-0000-0000-0000-000000000003', 'cmem-0012-0000-0000-0000-000000000012', 'pending', NULL, NULL);

-- Committee 4: Pending (INC-031) - new, just sent to committee
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at)
VALUES ('comm-0004-0000-0000-0000-000000000004', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-031'), 
        'pending', 3, NOW() - INTERVAL '2 hours');

UPDATE incidents SET committee_id = 'comm-0004-0000-0000-0000-000000000004', status = 'to_committee' 
WHERE incident_key = 'INC-031';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0013-0000-0000-0000-000000000013', 'comm-0004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', false, 'reviewer'),
  ('cmem-0014-0000-0000-0000-000000000014', 'comm-0004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', true, 'chair'),
  ('cmem-0015-0000-0000-0000-000000000015', 'comm-0004-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0004-0000-0000-0000-000000000004', 'cmem-0013-0000-0000-0000-000000000013', 'pending', NULL, NULL),
  ('comm-0004-0000-0000-0000-000000000004', 'cmem-0014-0000-0000-0000-000000000014', 'pending', NULL, NULL),
  ('comm-0004-0000-0000-0000-000000000004', 'cmem-0015-0000-0000-0000-000000000015', 'pending', NULL, NULL);

-- Committee 5: Approved (INC-007)
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at, decided_at)
VALUES ('comm-0005-0000-0000-0000-000000000005', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-007'), 
        'approved', 3, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days');

UPDATE incidents SET committee_id = 'comm-0005-0000-0000-0000-000000000005' 
WHERE incident_key = 'INC-007';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0016-0000-0000-0000-000000000016', 'comm-0005-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', false, 'reviewer'),
  ('cmem-0017-0000-0000-0000-000000000017', 'comm-0005-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', true, 'chair'),
  ('cmem-0018-0000-0000-0000-000000000018', 'comm-0005-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0005-0000-0000-0000-000000000005', 'cmem-0016-0000-0000-0000-000000000016', 'approved', NOW() - INTERVAL '3 days' - INTERVAL '2 hours', 'Good resolution plan'),
  ('comm-0005-0000-0000-0000-000000000005', 'cmem-0017-0000-0000-0000-000000000017', 'approved', NOW() - INTERVAL '3 days' - INTERVAL '1 hour', 'Approved'),
  ('comm-0005-0000-0000-0000-000000000005', 'cmem-0018-0000-0000-0000-000000000018', 'approved', NOW() - INTERVAL '3 days', 'Concur with team');

-- Committee 6: Vetoed (INC-020)
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at, decided_at)
VALUES ('comm-0006-0000-0000-0000-000000000006', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-020'), 
        'rejected', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

UPDATE incidents SET committee_id = 'comm-0006-0000-0000-0000-000000000006' 
WHERE incident_key = 'INC-020';

INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
VALUES 
  ('cmem-0019-0000-0000-0000-000000000019', 'comm-0006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', false, 'reviewer'),
  ('cmem-0020-0000-0000-0000-000000000020', 'comm-0006-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', true, 'chair'),
  ('cmem-0021-0000-0000-0000-000000000021', 'comm-0006-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555', false, 'reviewer');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0019-0000-0000-0000-000000000019', 'approved', NOW() - INTERVAL '4 days' - INTERVAL '3 hours', 'Reasonable approach'),
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0020-0000-0000-0000-000000000020', 'vetoed', NOW() - INTERVAL '4 days', 'VETO: Insufficient risk analysis. Redis has proven reliability in our stack. Migration introduces unnecessary risk without clear benefits. Recommend revisiting after Q2 stability review.'),
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0021-0000-0000-0000-000000000021', 'approved', NOW() - INTERVAL '4 days' - INTERVAL '1 hour', 'Worth exploring');

RAISE NOTICE 'Incident reports seed data inserted: 42 incidents, 6 committees, SLA records created';
