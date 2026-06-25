-- Phase 1.1: Seed normalized RBAC core data (4,443 rows exact)
-- Additive seeding: no existing data modified, only new rbac_* tables populated
-- Field distribution: ph_issues=45, incident_issues=40, business_requests=32, rh_releases=18, plan_test_cases=15, tasks=12, aggregated_feeds=0, strategy_items=0, plan_items=0, wiki_pages=0 (162 total)
-- Action matrix: project_hub=12, product_hub=10, release_hub=6, test_hub=7, task_hub=7, incident_hub=8, home_hub=3 (53 total)

-- ============================================================================
-- ROLES (17 exact)
-- ============================================================================
INSERT INTO public.rbac_roles (id, name, code, description, is_active, is_system)
VALUES
  ('d8a70000-0001-0000-0000-000000000000'::uuid, 'Admin', 'admin', 'System administrator with full access', true, true),
  ('d8a70000-0002-0000-0000-000000000000'::uuid, 'User', 'user', 'Default read-only access to assigned modules', true, true),
  ('d8a70000-0003-0000-0000-000000000000'::uuid, 'Product Owner', 'product_owner', 'Owns product strategy and prioritization', true, false),
  ('d8a70000-0004-0000-0000-000000000000'::uuid, 'Product Manager', 'product_manager', 'Manages product roadmap and features', true, false),
  ('d8a70000-0005-0000-0000-000000000000'::uuid, 'Business Owner', 'business_owner', 'Owns business outcomes and strategy', true, false),
  ('d8a70000-0006-0000-0000-000000000000'::uuid, 'Project Manager', 'project_manager', 'Manages project delivery and timelines', true, false),
  ('d8a70000-0007-0000-0000-000000000000'::uuid, 'Project Coordinator', 'project_coordinator', 'Coordinates project operations', true, false),
  ('d8a70000-0008-0000-0000-000000000000'::uuid, 'Release Manager', 'release_manager', 'Manages software releases', true, false),
  ('d8a70000-0009-0000-0000-000000000000'::uuid, 'Architect', 'architect', 'Defines technical architecture', true, false),
  ('d8a70000-000a-0000-0000-000000000000'::uuid, 'Developer', 'developer', 'Develops features and fixes', true, false),
  ('d8a70000-000b-0000-0000-000000000000'::uuid, 'QA Tester', 'qa_tester', 'Tests and validates quality', true, false),
  ('d8a70000-000c-0000-0000-000000000000'::uuid, 'Operations Engineer', 'operations_engineer', 'Manages operations and infrastructure', true, false),
  ('d8a70000-000d-0000-0000-000000000000'::uuid, 'Technical Support', 'technical_support', 'Provides technical support', true, false),
  ('d8a70000-000e-0000-0000-000000000000'::uuid, 'Support', 'support', 'Provides customer support', true, false),
  ('d8a70000-000f-0000-0000-000000000000'::uuid, 'Governance', 'governance', 'Manages governance and compliance', true, false),
  ('d8a70000-0010-0000-0000-000000000000'::uuid, 'PMO', 'pmo', 'Program Management Office', true, false),
  ('d8a70000-0011-0000-0000-000000000000'::uuid, 'Guest', 'guest', 'Limited read-only access, expires after 48 hours', true, false);

-- ============================================================================
-- MODULES (10 exact: 7 active + 3 dormant)
-- ============================================================================
INSERT INTO public.rbac_modules (id, key, name, route_prefix, primary_entity, description, is_active)
VALUES
  ('e1b80000-0001-0000-0000-000000000000'::uuid, 'project_hub', 'Project Hub', '/project-hub', 'ph_issues', 'Project work management', true),
  ('e1b80000-0002-0000-0000-000000000000'::uuid, 'product_hub', 'Product Hub', '/product-hub', 'business_requests', 'Product feature tracking', true),
  ('e1b80000-0003-0000-0000-000000000000'::uuid, 'release_hub', 'Release Hub', '/release-hub', 'rh_releases', 'Release management', true),
  ('e1b80000-0004-0000-0000-000000000000'::uuid, 'test_hub', 'Test Hub', '/testhub', 'plan_test_cases', 'Test management', true),
  ('e1b80000-0005-0000-0000-000000000000'::uuid, 'task_hub', 'Task Hub', '/tasks', 'tasks', 'Personal and team tasks', true),
  ('e1b80000-0006-0000-0000-000000000000'::uuid, 'incident_hub', 'Incident Hub', '/incident-hub', 'incident_issues', 'Incident management (read-only)', true),
  ('e1b80000-0007-0000-0000-000000000000'::uuid, 'home_hub', 'Home Hub', '/for-you', 'aggregated_feeds', 'Home and feed aggregation', true),
  ('e1b80000-0008-0000-0000-000000000000'::uuid, 'strategy_hub', 'Strategy Hub', '/strategy', 'strategy_items', 'Strategic planning (dormant)', false),
  ('e1b80000-0009-0000-0000-000000000000'::uuid, 'plan_hub', 'Plan Hub', '/plan', 'plan_items', 'Execution planning (dormant)', false),
  ('e1b80000-000a-0000-0000-000000000000'::uuid, 'wiki_hub', 'Wiki Hub', '/wiki', 'wiki_pages', 'Knowledge base (dormant)', false);

-- ============================================================================
-- ENTITIES (10 exact) — using APPROVED table names as keys
-- ============================================================================
INSERT INTO public.rbac_entities (id, module_id, key, name, table_name, description)
VALUES
  ('f2c90000-0001-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'ph_issues', 'Jira Issues', 'ph_issues', 'Project work items'),
  ('f2c90000-0002-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'business_requests', 'Business Requests', 'business_requests', 'Product feature requests'),
  ('f2c90000-0003-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'rh_releases', 'Releases', 'rh_releases', 'Software releases'),
  ('f2c90000-0004-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'plan_test_cases', 'Test Cases', 'plan_test_cases', 'Test cases and test suites'),
  ('f2c90000-0005-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'tasks', 'Tasks', 'tasks', 'Personal and team tasks'),
  ('f2c90000-0006-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'incident_issues', 'Incident Issues', 'incident_issues', 'Production incidents'),
  ('f2c90000-0007-0000-0000-000000000000'::uuid, 'e1b80000-0007-0000-0000-000000000000'::uuid, 'aggregated_feeds', 'Aggregated Feeds', 'aggregated_feeds', 'Feed aggregation'),
  ('f2c90000-0008-0000-0000-000000000000'::uuid, 'e1b80000-0008-0000-0000-000000000000'::uuid, 'strategy_items', 'Strategy Items', 'strategy_items', 'Strategic items'),
  ('f2c90000-0009-0000-0000-000000000000'::uuid, 'e1b80000-0009-0000-0000-000000000000'::uuid, 'plan_items', 'Plan Items', 'plan_items', 'Plan items'),
  ('f2c90000-000a-0000-0000-000000000000'::uuid, 'e1b80000-000a-0000-0000-000000000000'::uuid, 'wiki_pages', 'Wiki Pages', 'wiki_pages', 'Wiki pages');

-- ============================================================================
-- FIELDS (162 exact: 45+40+32+18+15+12+0+0+0+0)
-- ph_issues=45, incident_issues=40, business_requests=32, rh_releases=18, plan_test_cases=15, tasks=12
-- aggregated_feeds=0, strategy_items=0, plan_items=0, wiki_pages=0
-- ============================================================================

-- ph_issues: 45 fields (a0d10000-0001 through a0d10000-002d)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-0001-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'key', 'Issue Key', 'text', 'system'),
  ('a0d10000-0002-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'summary', 'Summary', 'text', 'normal'),
  ('a0d10000-0003-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-0004-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'normal'),
  ('a0d10000-0005-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'issue_type', 'Issue Type', 'text', 'system'),
  ('a0d10000-0006-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'priority', 'Priority', 'text', 'normal'),
  ('a0d10000-0007-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'assignee', 'Assignee', 'uuid', 'normal'),
  ('a0d10000-0008-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'reporter', 'Reporter', 'uuid', 'system'),
  ('a0d10000-0009-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'parent_key', 'Parent Issue', 'text', 'normal'),
  ('a0d10000-000a-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'due_date', 'Due Date', 'date', 'normal'),
  ('a0d10000-000b-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-000c-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-000d-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'labels', 'Labels', 'text', 'normal'),
  ('a0d10000-000e-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'fix_versions', 'Fix Versions', 'text', 'normal'),
  ('a0d10000-000f-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'components', 'Components', 'text', 'normal'),
  ('a0d10000-0010-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'story_points', 'Story Points', 'numeric', 'normal'),
  ('a0d10000-0011-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'sprint', 'Sprint', 'text', 'normal'),
  ('a0d10000-0012-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'epic', 'Epic', 'text', 'normal'),
  ('a0d10000-0013-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'severity', 'Severity', 'text', 'normal'),
  ('a0d10000-0014-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'watchers', 'Watchers', 'text', 'normal'),
  ('a0d10000-0015-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'time_tracking', 'Time Tracking', 'text', 'normal'),
  ('a0d10000-0016-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'assessment_feature', 'Assessment Feature', 'text', 'banned'),
  ('a0d10000-0017-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'service_now_ref', 'Service Now Ref', 'text', 'banned'),
  ('a0d10000-0018-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'project_key', 'Project', 'text', 'system'),
  ('a0d10000-0019-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'environment', 'Environment', 'text', 'normal'),
  ('a0d10000-001a-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'affected_users', 'Affected Users', 'text', 'normal'),
  ('a0d10000-001b-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'root_cause', 'Root Cause', 'text', 'normal'),
  ('a0d10000-001c-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'resolution_notes', 'Resolution Notes', 'text', 'normal'),
  ('a0d10000-001d-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'impact_level', 'Impact Level', 'text', 'normal'),
  ('a0d10000-001e-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'release_version', 'Release Version', 'text', 'normal'),
  ('a0d10000-001f-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'release_notes', 'Release Notes', 'text', 'normal'),
  ('a0d10000-0020-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'depends_on', 'Depends On', 'text', 'normal'),
  ('a0d10000-0021-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'blocked_by', 'Blocked By', 'text', 'normal'),
  ('a0d10000-0022-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'subtask_count', 'Subtask Count', 'numeric', 'derived'),
  ('a0d10000-0023-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'child_count', 'Child Issues', 'numeric', 'derived'),
  ('a0d10000-0024-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'start_date', 'Start Date', 'date', 'normal'),
  ('a0d10000-0025-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'estimate', 'Estimate', 'numeric', 'normal'),
  ('a0d10000-0026-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'time_spent', 'Time Spent', 'numeric', 'normal'),
  ('a0d10000-0027-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'resolution', 'Resolution', 'text', 'normal'),
  ('a0d10000-0028-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'resolution_date', 'Resolution Date', 'date', 'normal'),
  ('a0d10000-0029-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'environment_type', 'Environment Type', 'text', 'normal'),
  ('a0d10000-002a-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'queue_date', 'Queue Date', 'date', 'normal'),
  ('a0d10000-002b-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'linked_issues', 'Linked Issues', 'text', 'normal'),
  ('a0d10000-002c-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'comments_count', 'Comments', 'numeric', 'derived'),
  ('a0d10000-002d-0000-0000-000000000000'::uuid, 'f2c90000-0001-0000-0000-000000000000'::uuid, 'attachment_count', 'Attachments', 'numeric', 'derived');

-- incident_issues: 40 fields (a0d10000-002e through a0d10000-0055)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-002e-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'key', 'Incident Key', 'text', 'system'),
  ('a0d10000-002f-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'summary', 'Summary', 'text', 'normal'),
  ('a0d10000-0030-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-0031-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'read_only_system'),
  ('a0d10000-0032-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'severity', 'Severity', 'text', 'normal'),
  ('a0d10000-0033-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'assignee', 'Assignee', 'uuid', 'read_only_system'),
  ('a0d10000-0034-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'reporter', 'Reporter', 'uuid', 'system'),
  ('a0d10000-0035-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-0036-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-0037-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'jira_status', 'Jira Status', 'text', 'read_only_system'),
  ('a0d10000-0038-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'watchers', 'Watchers', 'text', 'normal'),
  ('a0d10000-0039-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'impact_area', 'Impact Area', 'text', 'normal'),
  ('a0d10000-003a-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'root_cause', 'Root Cause', 'text', 'read_only_system'),
  ('a0d10000-003b-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'resolution_time', 'Resolution Time', 'numeric', 'derived'),
  ('a0d10000-003c-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'on_call_responder', 'On-Call Responder', 'uuid', 'read_only_system'),
  ('a0d10000-003d-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'incident_timeline', 'Timeline', 'text', 'read_only_system'),
  ('a0d10000-003e-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'environment', 'Environment', 'text', 'normal'),
  ('a0d10000-003f-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'affected_services', 'Affected Services', 'text', 'normal'),
  ('a0d10000-0040-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'customer_impact', 'Customer Impact', 'text', 'normal'),
  ('a0d10000-0041-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'sev_level', 'Severity Level', 'text', 'normal'),
  ('a0d10000-0042-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'affected_users_count', 'Affected Users Count', 'numeric', 'normal'),
  ('a0d10000-0043-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'detection_time', 'Detection Time', 'timestamp', 'normal'),
  ('a0d10000-0044-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'mitigation_notes', 'Mitigation Notes', 'text', 'normal'),
  ('a0d10000-0045-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'escalation_level', 'Escalation Level', 'text', 'normal'),
  ('a0d10000-0046-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'postmortem_due', 'Postmortem Due', 'date', 'normal'),
  ('a0d10000-0047-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'incident_type', 'Incident Type', 'text', 'normal'),
  ('a0d10000-0048-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'communication_status', 'Communication Status', 'text', 'normal'),
  ('a0d10000-0049-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'mitigation_owner', 'Mitigation Owner', 'uuid', 'normal'),
  ('a0d10000-004a-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'detection_method', 'Detection Method', 'text', 'normal'),
  ('a0d10000-004b-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'components_affected', 'Components Affected', 'text', 'normal'),
  ('a0d10000-004c-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'monitoring_alerts', 'Monitoring Alerts', 'text', 'normal'),
  ('a0d10000-004d-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'resolution_status', 'Resolution Status', 'text', 'read_only_system'),
  ('a0d10000-004e-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'sla_breach', 'SLA Breach', 'boolean', 'derived'),
  ('a0d10000-004f-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'follow_up_actions', 'Follow-up Actions', 'text', 'normal'),
  ('a0d10000-0050-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'incident_id', 'Incident ID', 'text', 'system'),
  ('a0d10000-0051-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'escalation_notes', 'Escalation Notes', 'text', 'normal'),
  ('a0d10000-0052-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'resolution_summary', 'Resolution Summary', 'text', 'normal'),
  ('a0d10000-0053-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'response_time_sla', 'Response Time SLA', 'numeric', 'normal'),
  ('a0d10000-0054-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'context_notes', 'Context Notes', 'text', 'normal'),
  ('a0d10000-0055-0000-0000-000000000000'::uuid, 'f2c90000-0006-0000-0000-000000000000'::uuid, 'deployment_status', 'Deployment Status', 'text', 'normal');

-- business_requests: 32 fields (a0d10000-0056 through a0d10000-0075)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-0056-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'key', 'Request Key', 'text', 'system'),
  ('a0d10000-0057-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'summary', 'Summary', 'text', 'normal'),
  ('a0d10000-0058-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-0059-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'normal'),
  ('a0d10000-005a-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'request_type', 'Request Type', 'text', 'normal'),
  ('a0d10000-005b-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'priority', 'Priority', 'text', 'normal'),
  ('a0d10000-005c-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'product_code', 'Product Code', 'text', 'system'),
  ('a0d10000-005d-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'requestor', 'Requestor', 'uuid', 'normal'),
  ('a0d10000-005e-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'assignee', 'Assignee', 'uuid', 'normal'),
  ('a0d10000-005f-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'owner', 'Owner', 'uuid', 'normal'),
  ('a0d10000-0060-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'due_date', 'Due Date', 'date', 'normal'),
  ('a0d10000-0061-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-0062-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-0063-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'business_value', 'Business Value', 'numeric', 'normal'),
  ('a0d10000-0064-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'effort_estimate', 'Effort Estimate', 'numeric', 'normal'),
  ('a0d10000-0065-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'target_release', 'Target Release', 'text', 'normal'),
  ('a0d10000-0066-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'stakeholders', 'Stakeholders', 'text', 'normal'),
  ('a0d10000-0067-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'success_metrics', 'Success Metrics', 'text', 'normal'),
  ('a0d10000-0068-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'dependencies', 'Dependencies', 'text', 'normal'),
  ('a0d10000-0069-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'assumptions', 'Assumptions', 'text', 'normal'),
  ('a0d10000-006a-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'risks', 'Risks', 'text', 'normal'),
  ('a0d10000-006b-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'solution_approach', 'Solution Approach', 'text', 'normal'),
  ('a0d10000-006c-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'implementation_plan', 'Implementation Plan', 'text', 'normal'),
  ('a0d10000-006d-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'approval_status', 'Approval Status', 'text', 'normal'),
  ('a0d10000-006e-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'budget_required', 'Budget Required', 'numeric', 'normal'),
  ('a0d10000-006f-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'roi_projection', 'ROI Projection', 'numeric', 'normal'),
  ('a0d10000-0070-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'completion_percentage', 'Completion %', 'numeric', 'derived'),
  ('a0d10000-0071-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'related_requests', 'Related Requests', 'text', 'normal'),
  ('a0d10000-0072-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'start_date', 'Start Date', 'date', 'normal'),
  ('a0d10000-0073-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'market_impact', 'Market Impact', 'text', 'normal'),
  ('a0d10000-0074-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'compliance_requirements', 'Compliance Requirements', 'text', 'normal'),
  ('a0d10000-0075-0000-0000-000000000000'::uuid, 'f2c90000-0002-0000-0000-000000000000'::uuid, 'customer_feedback', 'Customer Feedback', 'text', 'normal');

-- rh_releases: 18 fields (a0d10000-0076 through a0d10000-0087)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-0076-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'key', 'Release Key', 'text', 'system'),
  ('a0d10000-0077-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'version', 'Version', 'text', 'normal'),
  ('a0d10000-0078-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'normal'),
  ('a0d10000-0079-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'target_date', 'Target Date', 'date', 'normal'),
  ('a0d10000-007a-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'release_owner', 'Release Owner', 'uuid', 'normal'),
  ('a0d10000-007b-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-007c-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-007d-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-007e-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'freeze_start', 'Freeze Start', 'date', 'normal'),
  ('a0d10000-007f-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'freeze_end', 'Freeze End', 'date', 'normal'),
  ('a0d10000-0080-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'notes', 'Release Notes', 'text', 'normal'),
  ('a0d10000-0081-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'items_count', 'Items Count', 'numeric', 'derived'),
  ('a0d10000-0082-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'signoff_status', 'Signoff Status', 'text', 'normal'),
  ('a0d10000-0083-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'deployment_date', 'Deployment Date', 'date', 'normal'),
  ('a0d10000-0084-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'testing_status', 'Testing Status', 'text', 'normal'),
  ('a0d10000-0085-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'risks', 'Risks', 'text', 'normal'),
  ('a0d10000-0086-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'communications', 'Communications', 'text', 'normal'),
  ('a0d10000-0087-0000-0000-000000000000'::uuid, 'f2c90000-0003-0000-0000-000000000000'::uuid, 'hotfixes_count', 'Hotfixes Count', 'numeric', 'derived');

-- plan_test_cases: 15 fields (a0d10000-0088 through a0d10000-0096)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-0088-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'key', 'Test Case Key', 'text', 'system'),
  ('a0d10000-0089-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'name', 'Name', 'text', 'normal'),
  ('a0d10000-008a-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-008b-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'test_type', 'Test Type', 'text', 'normal'),
  ('a0d10000-008c-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'normal'),
  ('a0d10000-008d-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'owner', 'Owner', 'uuid', 'normal'),
  ('a0d10000-008e-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-008f-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-0090-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'priority', 'Priority', 'text', 'normal'),
  ('a0d10000-0091-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'environment', 'Environment', 'text', 'normal'),
  ('a0d10000-0092-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'expected_result', 'Expected Result', 'text', 'normal'),
  ('a0d10000-0093-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'automation_status', 'Automation Status', 'text', 'normal'),
  ('a0d10000-0094-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'related_issue', 'Related Issue', 'text', 'normal'),
  ('a0d10000-0095-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'last_executed', 'Last Executed', 'timestamp', 'derived'),
  ('a0d10000-0096-0000-0000-000000000000'::uuid, 'f2c90000-0004-0000-0000-000000000000'::uuid, 'estimated_duration', 'Estimated Duration', 'numeric', 'normal');

-- tasks: 12 fields (a0d10000-0097 through a0d10000-00a2)
INSERT INTO public.rbac_fields (id, entity_id, key, display_name, data_type, classification) VALUES
  ('a0d10000-0097-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'key', 'Task Key', 'text', 'system'),
  ('a0d10000-0098-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'title', 'Title', 'text', 'normal'),
  ('a0d10000-0099-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'description', 'Description', 'text', 'normal'),
  ('a0d10000-009a-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'status', 'Status', 'text', 'normal'),
  ('a0d10000-009b-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'assignee', 'Assignee', 'uuid', 'normal'),
  ('a0d10000-009c-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'due_date', 'Due Date', 'date', 'normal'),
  ('a0d10000-009d-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'priority', 'Priority', 'text', 'normal'),
  ('a0d10000-009e-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'created_at', 'Created', 'timestamp', 'system'),
  ('a0d10000-009f-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'updated_at', 'Updated', 'timestamp', 'system'),
  ('a0d10000-00a0-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'creator', 'Creator', 'uuid', 'system'),
  ('a0d10000-00a1-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'completion_percentage', 'Completion %', 'numeric', 'derived'),
  ('a0d10000-00a2-0000-0000-000000000000'::uuid, 'f2c90000-0005-0000-0000-000000000000'::uuid, 'category', 'Category', 'text', 'normal');

-- ============================================================================
-- ACTIONS (53 exact: 12+10+6+7+7+8+3)
-- ============================================================================

-- project_hub: 12 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-0001-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'read', 'Read Issues', 'CRUD'),
  ('b1e20000-0002-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'create', 'Create Issue', 'CRUD'),
  ('b1e20000-0003-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'update', 'Update Issue', 'CRUD'),
  ('b1e20000-0004-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'delete', 'Delete Issue', 'CRUD'),
  ('b1e20000-0005-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'bulk_update', 'Bulk Update', 'BULK'),
  ('b1e20000-0006-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'bulk_delete', 'Bulk Delete', 'BULK'),
  ('b1e20000-0007-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'export_csv', 'Export CSV', 'EXPORT'),
  ('b1e20000-0008-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'add_comment', 'Add Comment', 'COLLABORATION'),
  ('b1e20000-0009-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'add_watcher', 'Add Watcher', 'COLLABORATION'),
  ('b1e20000-000a-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'add_attachment', 'Add Attachment', 'COLLABORATION'),
  ('b1e20000-000b-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'ask_caty', 'Ask Caty', 'AI'),
  ('b1e20000-000c-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'improve_story', 'Improve Story', 'AI');

-- product_hub: 10 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-000d-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'read', 'Read Requests', 'CRUD'),
  ('b1e20000-000e-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'create', 'Create Request', 'CRUD'),
  ('b1e20000-000f-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'update', 'Update Request', 'CRUD'),
  ('b1e20000-0010-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'delete', 'Delete Request', 'CRUD'),
  ('b1e20000-0011-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'bulk_update', 'Bulk Update', 'BULK'),
  ('b1e20000-0012-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'export_csv', 'Export CSV', 'EXPORT'),
  ('b1e20000-0013-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'add_comment', 'Add Comment', 'COLLABORATION'),
  ('b1e20000-0014-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'add_watcher', 'Add Watcher', 'COLLABORATION'),
  ('b1e20000-0015-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'ask_caty', 'Ask Caty', 'AI'),
  ('b1e20000-0016-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'improve_story', 'Improve Story', 'AI');

-- release_hub: 6 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-0017-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'read', 'Read Releases', 'CRUD'),
  ('b1e20000-0018-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'create', 'Create Release', 'CRUD'),
  ('b1e20000-0019-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'update', 'Update Release', 'CRUD'),
  ('b1e20000-001a-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'export_csv', 'Export CSV', 'EXPORT'),
  ('b1e20000-001b-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'sign_off_release', 'Sign Off Release', 'MODULE_SPECIFIC'),
  ('b1e20000-001c-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'manage_freeze_window', 'Manage Freeze Window', 'MODULE_SPECIFIC');

-- test_hub: 7 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-001d-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'read', 'Read Test Cases', 'CRUD'),
  ('b1e20000-001e-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'create', 'Create Test Case', 'CRUD'),
  ('b1e20000-001f-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'update', 'Update Test Case', 'CRUD'),
  ('b1e20000-0020-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'delete', 'Delete Test Case', 'CRUD'),
  ('b1e20000-0021-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'export_csv', 'Export CSV', 'EXPORT'),
  ('b1e20000-0022-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'execute_test_cycle', 'Execute Test Cycle', 'MODULE_SPECIFIC'),
  ('b1e20000-0023-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'generate_test_report', 'Generate Test Report', 'MODULE_SPECIFIC');

-- task_hub: 7 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-0024-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'read', 'Read Tasks', 'CRUD'),
  ('b1e20000-0025-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'create', 'Create Task', 'CRUD'),
  ('b1e20000-0026-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'update', 'Update Task', 'CRUD'),
  ('b1e20000-0027-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'delete', 'Delete Task', 'CRUD'),
  ('b1e20000-0028-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'bulk_update', 'Bulk Update', 'BULK'),
  ('b1e20000-0029-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'bulk_delete', 'Bulk Delete', 'BULK'),
  ('b1e20000-002a-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'export_csv', 'Export CSV', 'EXPORT');

-- incident_hub: 8 actions (mutations all locked false for all roles)
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-002b-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'read', 'Read Incidents', 'CRUD'),
  ('b1e20000-002c-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'create', 'Create Incident', 'CRUD'),
  ('b1e20000-002d-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'update', 'Update Incident', 'CRUD'),
  ('b1e20000-002e-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'delete', 'Delete Incident', 'CRUD'),
  ('b1e20000-002f-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'add_comment', 'Add Comment', 'COLLABORATION'),
  ('b1e20000-0030-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'add_watcher', 'Add Watcher', 'COLLABORATION'),
  ('b1e20000-0031-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'add_attachment', 'Add Attachment', 'COLLABORATION'),
  ('b1e20000-0032-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'transition_status', 'Transition Status', 'MODULE_SPECIFIC');

-- home_hub: 3 actions
INSERT INTO public.rbac_actions (id, module_id, key, name, category)
VALUES
  ('b1e20000-0033-0000-0000-000000000000'::uuid, 'e1b80000-0007-0000-0000-000000000000'::uuid, 'read', 'Read Feed', 'CRUD'),
  ('b1e20000-0034-0000-0000-000000000000'::uuid, 'e1b80000-0007-0000-0000-000000000000'::uuid, 'save_view', 'Save View', 'MODULE_SPECIFIC'),
  ('b1e20000-0035-0000-0000-000000000000'::uuid, 'e1b80000-0007-0000-0000-000000000000'::uuid, 'create_filter', 'Create Filter', 'MODULE_SPECIFIC');

-- ============================================================================
-- WORKFLOWS (6 exact, 20 transitions)
-- ============================================================================
INSERT INTO public.rbac_workflows (id, module_id, key, name, description)
VALUES
  ('c2f30000-0001-0000-0000-000000000000'::uuid, 'e1b80000-0001-0000-0000-000000000000'::uuid, 'project_workflow', 'Project Workflow', 'Standard workflow for project issues'),
  ('c2f30000-0002-0000-0000-000000000000'::uuid, 'e1b80000-0002-0000-0000-000000000000'::uuid, 'product_workflow', 'Product Workflow', 'Standard workflow for product requests'),
  ('c2f30000-0003-0000-0000-000000000000'::uuid, 'e1b80000-0003-0000-0000-000000000000'::uuid, 'release_workflow', 'Release Workflow', 'Workflow for releases'),
  ('c2f30000-0004-0000-0000-000000000000'::uuid, 'e1b80000-0004-0000-0000-000000000000'::uuid, 'test_workflow', 'Test Workflow', 'Workflow for test cases'),
  ('c2f30000-0005-0000-0000-000000000000'::uuid, 'e1b80000-0005-0000-0000-000000000000'::uuid, 'task_workflow', 'Task Workflow', 'Workflow for tasks'),
  ('c2f30000-0006-0000-0000-000000000000'::uuid, 'e1b80000-0006-0000-0000-000000000000'::uuid, 'incident_workflow', 'Incident Workflow', 'Workflow for incidents (read-only)');

INSERT INTO public.rbac_workflow_transitions (id, workflow_id, from_status, to_status)
VALUES
  ('d3a40000-0001-0000-0000-000000000000'::uuid, 'c2f30000-0001-0000-0000-000000000000'::uuid, 'todo', 'in_progress'),
  ('d3a40000-0002-0000-0000-000000000000'::uuid, 'c2f30000-0001-0000-0000-000000000000'::uuid, 'in_progress', 'done'),
  ('d3a40000-0003-0000-0000-000000000000'::uuid, 'c2f30000-0001-0000-0000-000000000000'::uuid, 'todo', 'done'),
  ('d3a40000-0004-0000-0000-000000000000'::uuid, 'c2f30000-0002-0000-0000-000000000000'::uuid, 'backlog', 'in_progress'),
  ('d3a40000-0005-0000-0000-000000000000'::uuid, 'c2f30000-0002-0000-0000-000000000000'::uuid, 'in_progress', 'done'),
  ('d3a40000-0006-0000-0000-000000000000'::uuid, 'c2f30000-0002-0000-0000-000000000000'::uuid, 'backlog', 'done'),
  ('d3a40000-0007-0000-0000-000000000000'::uuid, 'c2f30000-0003-0000-0000-000000000000'::uuid, 'planning', 'in_progress'),
  ('d3a40000-0008-0000-0000-000000000000'::uuid, 'c2f30000-0003-0000-0000-000000000000'::uuid, 'in_progress', 'released'),
  ('d3a40000-0009-0000-0000-000000000000'::uuid, 'c2f30000-0003-0000-0000-000000000000'::uuid, 'planning', 'released'),
  ('d3a40000-000a-0000-0000-000000000000'::uuid, 'c2f30000-0004-0000-0000-000000000000'::uuid, 'draft', 'ready'),
  ('d3a40000-000b-0000-0000-000000000000'::uuid, 'c2f30000-0004-0000-0000-000000000000'::uuid, 'ready', 'executed'),
  ('d3a40000-000c-0000-0000-000000000000'::uuid, 'c2f30000-0004-0000-0000-000000000000'::uuid, 'draft', 'executed'),
  ('d3a40000-000d-0000-0000-000000000000'::uuid, 'c2f30000-0005-0000-0000-000000000000'::uuid, 'open', 'in_progress'),
  ('d3a40000-000e-0000-0000-000000000000'::uuid, 'c2f30000-0005-0000-0000-000000000000'::uuid, 'in_progress', 'closed'),
  ('d3a40000-000f-0000-0000-000000000000'::uuid, 'c2f30000-0005-0000-0000-000000000000'::uuid, 'open', 'closed'),
  ('d3a40000-0010-0000-0000-000000000000'::uuid, 'c2f30000-0006-0000-0000-000000000000'::uuid, 'open', 'investigating'),
  ('d3a40000-0011-0000-0000-000000000000'::uuid, 'c2f30000-0006-0000-0000-000000000000'::uuid, 'investigating', 'resolved'),
  ('d3a40000-0012-0000-0000-000000000000'::uuid, 'c2f30000-0006-0000-0000-000000000000'::uuid, 'resolved', 'closed'),
  ('d3a40000-0013-0000-0000-000000000000'::uuid, 'c2f30000-0006-0000-0000-000000000000'::uuid, 'open', 'resolved'),
  ('d3a40000-0014-0000-0000-000000000000'::uuid, 'c2f30000-0006-0000-0000-000000000000'::uuid, 'investigating', 'closed');

-- ============================================================================
-- ROLE-MODULE PERMISSIONS (170 = 17 × 10)
-- ============================================================================
INSERT INTO public.rbac_role_module_permissions (id, role_id, module_id, can_read, can_create, can_update, can_delete, can_export, can_bulk_update, can_bulk_delete)
SELECT gen_random_uuid(), r.id, m.id,
  CASE WHEN r.code = 'admin' THEN true
       WHEN r.code = 'user' THEN m.is_active AND m.key IN ('project_hub','product_hub','release_hub','home_hub')
       WHEN r.code IN ('product_owner','product_manager') THEN m.is_active AND m.key IN ('product_hub','project_hub','home_hub')
       WHEN r.code IN ('project_manager','project_coordinator','architect','developer') THEN m.is_active AND m.key IN ('project_hub','release_hub','home_hub')
       WHEN r.code IN ('release_manager') THEN m.is_active AND m.key IN ('release_hub','project_hub','home_hub')
       WHEN r.code IN ('qa_tester') THEN m.is_active AND m.key IN ('test_hub','project_hub','home_hub')
       WHEN r.code IN ('operations_engineer','technical_support','support') THEN m.is_active AND m.key IN ('incident_hub','home_hub')
       WHEN r.code IN ('governance','pmo') THEN m.is_active AND m.key IN ('project_hub','product_hub','release_hub','home_hub')
       WHEN r.code = 'guest' THEN m.is_active AND m.key = 'home_hub'
       ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END,
  CASE WHEN r.code = 'admin' THEN true ELSE false END
FROM public.rbac_roles r CROSS JOIN public.rbac_modules m;

-- ============================================================================
-- ROLE-FIELD PERMISSIONS (2,754 = 17 × 162)
-- ============================================================================
INSERT INTO public.rbac_role_field_permissions (id, role_id, field_id, can_view, can_update, can_clear, can_export, is_masked)
SELECT gen_random_uuid(), r.id, f.id,
  CASE WHEN f.classification = 'banned' THEN false
       WHEN r.code = 'admin' THEN true
       WHEN f.classification IN ('system','read_only_system','derived') THEN true
       ELSE true END,
  CASE WHEN f.classification = 'banned' THEN false
       WHEN r.code = 'admin' AND f.classification NOT IN ('system','read_only_system','derived') THEN true
       ELSE false END,
  CASE WHEN f.classification = 'banned' THEN false
       WHEN r.code = 'admin' AND f.classification NOT IN ('system','read_only_system','derived') THEN true
       ELSE false END,
  CASE WHEN f.classification = 'banned' THEN false
       WHEN r.code = 'admin' THEN true
       WHEN f.classification IN ('system','read_only_system') THEN false
       ELSE true END,
  CASE WHEN f.classification = 'banned' THEN true ELSE false END
FROM public.rbac_roles r CROSS JOIN public.rbac_fields f;

-- ============================================================================
-- ROLE-ACTION PERMISSIONS (901 = 17 × 53)
-- Incident mutations locked false for ALL roles (including Admin)
-- ============================================================================
INSERT INTO public.rbac_role_action_permissions (id, role_id, action_id, is_allowed)
SELECT gen_random_uuid(), r.id, a.id,
  CASE WHEN a.module_id = 'e1b80000-0006-0000-0000-000000000000'::uuid AND a.key IN ('create','update','delete','add_comment','add_watcher','add_attachment','transition_status') THEN false
       WHEN r.code = 'admin' THEN true
       WHEN r.code = 'user' THEN a.module_id = 'e1b80000-0007-0000-0000-000000000000'::uuid AND a.key = 'read'
       WHEN r.code = 'guest' THEN a.module_id = 'e1b80000-0007-0000-0000-000000000000'::uuid AND a.key = 'read'
       ELSE false END
FROM public.rbac_roles r CROSS JOIN public.rbac_actions a;

-- ============================================================================
-- ROLE-TRANSITION PERMISSIONS (340 = 17 × 20)
-- Incident transitions locked false for ALL roles
-- ============================================================================
INSERT INTO public.rbac_role_transition_permissions (id, role_id, transition_id, is_allowed)
SELECT gen_random_uuid(), r.id, t.id,
  CASE WHEN t.workflow_id = 'c2f30000-0006-0000-0000-000000000000'::uuid THEN false
       WHEN r.code = 'admin' THEN true
       ELSE false END
FROM public.rbac_roles r CROSS JOIN public.rbac_workflow_transitions t;

-- ============================================================================
-- TOTALS SUMMARY (4,443 rows exact)
-- 17 + 10 + 10 + 162 + 53 + 6 + 20 + 170 + 2,754 + 901 + 340 = 4,443
-- ============================================================================
