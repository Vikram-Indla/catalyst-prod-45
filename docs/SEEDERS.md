# Catalyst Seeders Documentation

> **⚠️ IMPORTANT**: This project follows a **Zero-Seed Production Mandate**. All seeded data must be removed before publishing to production to ensure production databases are clean and populated only through normal application usage.

---

## Table of Contents

1. [Overview](#overview)
2. [Main Seed File](#main-seed-file-supabaseseedsql)
3. [Incident Reports Seed](#incident-reports-seed-supabaseseed-incidents-reportssql)
4. [Committee Seed](#committee-seed-supabaseseed-committeessql)
5. [Planner Module Seed](#planner-module-seed-srcmodulesplannerdataseeddatats)
6. [Migration-Embedded Lookup Data](#migration-embedded-lookup-data)
7. [Production Cleanup](#production-cleanup)

---

## Overview

Catalyst uses SQL seed files and TypeScript mock data to populate the development database with test data. These files are located in:

| File | Module | Records |
|------|--------|---------|
| `supabase/seed.sql` | Dependencies, Risks | 20 dependencies, 18 risks |
| `supabase/seed-incidents-reports.sql` | Incidents | 42 incidents, 6 committees |
| `supabase/seed-committees.sql` | Committees | Mixed voting states |
| `src/modules/planner/data/seedData.ts` | Planner | 14 tasks, 7 users, 3 teams |

---

## Main Seed File (`supabase/seed.sql`)

### Dependencies Module (20 records)

```sql
-- Seed data for Dependencies module testing
-- This file provides comprehensive test data for the Dependencies feature

-- Insert external entities for external dependencies
INSERT INTO public.external_entities (id, name, entity_type, description, is_active, contact_info) VALUES
('ext-1', 'Third-Party Vendor A', 'vendor', 'External payment processing vendor', true, '{"contact": "vendor-a@example.com", "phone": "+1-555-0101"}'::jsonb),
('ext-2', 'Government Agency', 'agency', 'Regulatory compliance agency', true, '{"contact": "agency@gov.example", "department": "Compliance"}'::jsonb),
('ext-3', 'Partner Company B', 'partner', 'Strategic integration partner', true, '{"contact": "partner-b@example.com", "account_manager": "John Smith"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert sample dependencies (20 dependencies covering various scenarios)
INSERT INTO public.dependencies (
  id, from_feature_id, to_feature_id, type, status, risk_level,
  dependency_level, description, pi_id,
  requesting_team_id, depends_on_team_id,
  requesting_program_id, depends_on_program_id,
  needed_by_date, committed_by_date,
  blocked_requestor, blocked_respondent,
  blocked_reason_requestor, blocked_reason_respondent,
  no_work_required, notify_on_commit, notify_on_delivery,
  rank_order, criticality_score
)
SELECT
  'dep-' || seq::text,
  (SELECT id FROM features ORDER BY random() LIMIT 1),
  (SELECT id FROM features ORDER BY random() LIMIT 1),
  CASE (seq % 4)
    WHEN 0 THEN 'sequential'
    WHEN 1 THEN 'concurrent'
    WHEN 2 THEN 'program'
    ELSE 'external'
  END,
  CASE (seq % 9)
    WHEN 0 THEN 'open'
    WHEN 1 THEN 'pending_commit'
    WHEN 2 THEN 'negotiation'
    WHEN 3 THEN 'committed'
    WHEN 4 THEN 'in_progress'
    WHEN 5 THEN 'delivered'
    WHEN 6 THEN 'done'
    WHEN 7 THEN 'no_work_done'
    ELSE 'rejected'
  END,
  CASE (seq % 3)
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'med'
    ELSE 'high'
  END,
  CASE (seq % 3)
    WHEN 0 THEN 'team'
    WHEN 1 THEN 'program'
    ELSE 'external'
  END,
  'Dependency ' || seq || ': ' || CASE (seq % 5)
    WHEN 0 THEN 'API integration required before proceeding'
    WHEN 1 THEN 'Database schema must be finalized'
    WHEN 2 THEN 'Security review and approval needed'
    WHEN 3 THEN 'Infrastructure provisioning required'
    ELSE 'Third-party service integration'
  END,
  (SELECT id FROM program_increments ORDER BY random() LIMIT 1),
  (SELECT id FROM teams ORDER BY random() LIMIT 1),
  (SELECT id FROM teams ORDER BY random() LIMIT 1),
  (SELECT id FROM programs ORDER BY random() LIMIT 1),
  (SELECT id FROM programs ORDER BY random() LIMIT 1),
  CURRENT_DATE + (seq * 7 || ' days')::interval,
  CASE WHEN seq % 3 = 0 THEN CURRENT_DATE + (seq * 5 || ' days')::interval ELSE NULL END,
  CASE WHEN seq % 7 = 0 THEN true ELSE false END,
  CASE WHEN seq % 11 = 0 THEN true ELSE false END,
  CASE WHEN seq % 7 = 0 THEN 'Waiting for technical specifications' ELSE NULL END,
  CASE WHEN seq % 11 = 0 THEN 'Resource constraints - team fully allocated' ELSE NULL END,
  CASE WHEN seq % 15 = 0 THEN true ELSE false END,
  true,
  true,
  seq,
  (seq % 10) * 10
FROM generate_series(1, 20) AS seq
ON CONFLICT (id) DO NOTHING;

-- Update a few dependencies to have external entity references
UPDATE public.dependencies
SET 
  external_entity_id = 'ext-1',
  depends_on_team_id = NULL,
  depends_on_program_id = NULL
WHERE id IN ('dep-4', 'dep-8', 'dep-12');

UPDATE public.dependencies
SET 
  external_entity_id = 'ext-2',
  depends_on_team_id = NULL,
  depends_on_program_id = NULL
WHERE id IN ('dep-16');

UPDATE public.dependencies
SET 
  external_entity_id = 'ext-3',
  depends_on_team_id = NULL,
  depends_on_program_id = NULL
WHERE id IN ('dep-20');

-- Insert dependency negotiations (for dependencies in negotiation status)
INSERT INTO public.dependency_negotiations (
  id, dependency_id, proposed_by, proposed_date, proposed_sprint_id,
  counter_proposal, status, notes
)
SELECT
  'neg-' || seq::text,
  'dep-' || (seq * 2)::text,
  (SELECT id FROM profiles ORDER BY random() LIMIT 1),
  CURRENT_DATE + ((seq - 1) * 3 || ' days')::interval,
  (SELECT id FROM iterations ORDER BY random() LIMIT 1),
  CASE WHEN seq % 2 = 0 THEN true ELSE false END,
  CASE (seq % 3)
    WHEN 0 THEN 'proposed'
    WHEN 1 THEN 'accepted'
    ELSE 'rejected'
  END,
  'Negotiation note ' || seq || ': ' || CASE (seq % 3)
    WHEN 0 THEN 'Proposed alternative delivery date due to resource constraints'
    WHEN 1 THEN 'Counter-proposal: split delivery into two phases'
    ELSE 'Accepted with additional technical support commitment'
  END
FROM generate_series(1, 5) AS seq
WHERE EXISTS (SELECT 1 FROM dependencies WHERE id = 'dep-' || (seq * 2)::text)
ON CONFLICT (id) DO NOTHING;

-- Add some work item links (for story-level dependency tracking)
INSERT INTO public.work_item_links (
  id, from_item_id, from_item_type, to_item_id, to_item_type,
  link_type, dependency_id
)
SELECT
  'link-' || seq::text,
  (SELECT id FROM stories ORDER BY random() LIMIT 1),
  'story',
  (SELECT id FROM stories ORDER BY random() LIMIT 1),
  'story',
  CASE (seq % 4)
    WHEN 0 THEN 'blocks'
    WHEN 1 THEN 'blocked_by'
    WHEN 2 THEN 'relates_to'
    ELSE 'duplicates'
  END,
  'dep-' || seq::text
FROM generate_series(1, 10) AS seq
WHERE EXISTS (SELECT 1 FROM dependencies WHERE id = 'dep-' || seq::text)
  AND EXISTS (SELECT 1 FROM stories LIMIT 2)
ON CONFLICT (id) DO NOTHING;
```

### Risks Module (18 records)

```sql
-- ============================================================================
-- RISKS MODULE SEED DATA
-- ============================================================================
-- Comprehensive seed data for Risks module testing (15+ records)
-- Covers all ROAM statuses, severity levels, relationships, and features

INSERT INTO public.risks (
  id,
  risk_number,
  title,
  description,
  status,
  occurrence,
  impact,
  critical_path,
  program_id,
  program_increment_id,
  owner_id,
  relationship,
  related_item_id,
  resolution_method,
  target_resolution_date,
  notify,
  consequence,
  contingency,
  mitigation,
  resolution_status,
  tags,
  created_by
)
SELECT
  'risk-' || seq::text,
  seq,
  CASE seq
    WHEN 1 THEN 'API Integration Failure Risk'
    WHEN 2 THEN 'Database Performance Degradation'
    WHEN 3 THEN 'Third-Party Service Dependency'
    WHEN 4 THEN 'Security Vulnerability in Legacy Code'
    WHEN 5 THEN 'Resource Availability for Q4 Sprint'
    WHEN 6 THEN 'Technical Debt Accumulation'
    WHEN 7 THEN 'Compliance Audit Findings'
    WHEN 8 THEN 'Cloud Infrastructure Cost Overrun'
    WHEN 9 THEN 'Team Skill Gap in New Technology'
    WHEN 10 THEN 'Vendor Contract Renewal Delay'
    WHEN 11 THEN 'Production Deployment Pipeline Issues'
    WHEN 12 THEN 'User Acceptance Testing Delays'
    WHEN 13 THEN 'Cross-Team Dependency Blocking'
    WHEN 14 THEN 'Data Migration Complexity'
    WHEN 15 THEN 'Regulatory Compliance Changes'
    WHEN 16 THEN 'Customer Feature Request Priority Shift'
    WHEN 17 THEN 'Infrastructure Scaling Limitations'
    WHEN 18 THEN 'Integration Testing Environment Instability'
    ELSE 'Risk ' || seq
  END,
  CASE seq
    WHEN 1 THEN 'Third-party API may not support required throughput during peak load. Could cause system failures.'
    WHEN 2 THEN 'Database queries showing 2x slowdown. May impact user experience and SLA compliance.'
    WHEN 3 THEN 'Critical external service has 99.5% SLA, below our 99.9% requirement. Needs mitigation strategy.'
    WHEN 4 THEN 'Legacy authentication module has known CVE vulnerabilities that need immediate patching.'
    WHEN 5 THEN 'Key backend developer taking leave during critical sprint. Backup resource needed.'
    WHEN 6 THEN 'Accumulating shortcuts in codebase. Refactoring needed to maintain velocity.'
    WHEN 7 THEN 'Recent audit identified 12 compliance gaps that must be addressed before go-live.'
    WHEN 8 THEN 'Cloud costs exceeding budget by 30%. Need optimization or budget adjustment.'
    WHEN 9 THEN 'Team lacks Kubernetes expertise needed for new microservices architecture.'
    WHEN 10 THEN 'Current vendor contract expires in 60 days. Renewal negotiations not started.'
    WHEN 11 THEN 'CI/CD pipeline failing intermittently. Blocking deployments and causing delays.'
    WHEN 12 THEN 'UAT phase scheduled for 2 weeks may not be sufficient for complex feature set.'
    WHEN 13 THEN 'Payment team blocked on authentication API from Identity team.'
    WHEN 14 THEN 'Legacy database migration estimated at 40 hours but could take 80+ hours.'
    WHEN 15 THEN 'New GDPR requirements effective next quarter require architecture changes.'
    WHEN 16 THEN 'Top customer requesting priority feature change mid-sprint disrupting roadmap.'
    WHEN 17 THEN 'Current infrastructure cannot scale beyond 10K concurrent users per tests.'
    WHEN 18 THEN 'Test environment crashes daily requiring manual restarts and data reseeds.'
    ELSE 'Description for risk ' || seq
  END,
  CASE (seq % 3)
    WHEN 0 THEN 'Closed'
    ELSE 'Open'
  END,
  CASE (seq % 4)
    WHEN 0 THEN 'Low'
    WHEN 1 THEN 'Medium'
    WHEN 2 THEN 'High'
    ELSE 'Critical'
  END,
  CASE (seq % 4)
    WHEN 0 THEN 'Low'
    WHEN 1 THEN 'Medium'
    WHEN 2 THEN 'High'
    ELSE 'Critical'
  END,
  CASE WHEN seq % 5 = 0 THEN 'Yes' ELSE 'No' END,
  (SELECT id FROM programs ORDER BY random() LIMIT 1),
  (SELECT id FROM program_increments ORDER BY random() LIMIT 1),
  (SELECT id FROM profiles ORDER BY random() LIMIT 1),
  CASE (seq % 5)
    WHEN 0 THEN 'Theme'
    WHEN 1 THEN 'Epic'
    WHEN 2 THEN 'Capability'
    WHEN 3 THEN 'Feature'
    ELSE 'Program Increment'
  END,
  CASE (seq % 5)
    WHEN 0 THEN (SELECT id FROM strategic_themes ORDER BY random() LIMIT 1)
    WHEN 1 THEN (SELECT id FROM epics ORDER BY random() LIMIT 1)
    WHEN 3 THEN (SELECT id FROM features ORDER BY random() LIMIT 1)
    ELSE NULL
  END,
  CASE (seq % 4)
    WHEN 0 THEN 'Resolved'
    WHEN 1 THEN 'Owned'
    WHEN 2 THEN 'Accepted'
    ELSE 'Mitigated'
  END,
  CASE 
    WHEN seq % 3 = 0 THEN CURRENT_DATE + (seq * 5 || ' days')::interval
    WHEN seq % 3 = 1 THEN CURRENT_DATE + (seq * 10 || ' days')::interval
    ELSE CURRENT_DATE + (seq * 7 || ' days')::interval
  END,
  CASE 
    WHEN seq % 4 = 0 THEN 'product-owner@example.com, tech-lead@example.com'
    WHEN seq % 4 = 1 THEN 'scrum-master@example.com'
    WHEN seq % 4 = 2 THEN 'architecture-team@example.com, compliance@example.com'
    ELSE NULL
  END,
  CASE seq
    WHEN 1 THEN 'System downtime during peak hours. Customer impact: 500+ users affected. Revenue loss: $50K/hour.'
    WHEN 2 THEN 'Degraded user experience leads to customer churn. Projected 15% increase in support tickets.'
    WHEN 3 THEN 'Service outage could cascade to dependent systems affecting entire platform availability.'
    WHEN 4 THEN 'Data breach potential with GDPR violations. Fine exposure: €20M. Reputation damage severe.'
    WHEN 5 THEN 'Sprint commitment at risk. Delivery delay of 2 weeks impacting release schedule.'
    WHEN 6 THEN 'Development velocity decreases 30%. Future features take longer to implement.'
    WHEN 7 THEN 'Regulatory non-compliance could block production deployment and market entry.'
    WHEN 8 THEN 'Budget overrun of $120K annually. Need CFO approval or feature cuts.'
    WHEN 9 THEN 'Implementation delays of 4-6 weeks while team ramps up on new technology stack.'
    WHEN 10 THEN 'Service interruption if contract expires. No alternative vendor identified.'
    ELSE 'Critical impact on project timeline and deliverables. Customer satisfaction at risk.'
  END,
  CASE seq
    WHEN 1 THEN 'Implement circuit breaker pattern. Add request queuing and retry logic with exponential backoff.'
    WHEN 2 THEN 'Enable query caching layer. Optimize top 10 slowest queries identified in monitoring.'
    WHEN 3 THEN 'Deploy backup service provider. Implement automatic failover within 30 seconds.'
    WHEN 4 THEN 'Apply security patches immediately. Schedule refactoring sprint for Q3.'
    WHEN 5 THEN 'Cross-train 2 frontend developers on backend codebase. Document critical workflows.'
    WHEN 6 THEN 'Allocate 20% of sprint capacity to refactoring. Implement code quality gates.'
    WHEN 7 THEN 'Create remediation plan with compliance team. Weekly progress reviews with auditors.'
    WHEN 8 THEN 'Implement resource tagging and monitoring. Right-size instances based on usage patterns.'
    WHEN 9 THEN 'Schedule 2-week training bootcamp. Pair programming with external consultant.'
    WHEN 10 THEN 'Escalate to procurement. Identify 2 alternative vendors as backup options.'
    ELSE 'Develop fallback plan. Increase monitoring and establish escalation procedures.'
  END,
  CASE seq
    WHEN 1 THEN 'Upgrade to enterprise API tier with guaranteed SLA. Add monitoring alerts at 80% threshold.'
    WHEN 2 THEN 'Migrate to PostgreSQL 15 with query optimization. Implement read replicas for reporting.'
    WHEN 3 THEN 'Implement local caching strategy reducing external calls by 70%. Review SLA monthly.'
    WHEN 4 THEN 'Complete security audit and patching. Enable vulnerability scanning in CI/CD pipeline.'
    WHEN 5 THEN 'Hire contractor for sprint coverage. Adjust sprint scope to critical path items only.'
    WHEN 6 THEN 'Establish technical debt tracking and paydown schedule. Set quality metrics baseline.'
    WHEN 7 THEN 'Complete all 12 remediation items. Schedule follow-up audit for compliance sign-off.'
    WHEN 8 THEN 'Implement cost optimization: auto-scaling, reserved instances, spot instances for dev.'
    WHEN 9 THEN 'Complete training program. Assign mentors. Start with non-critical component migration.'
    WHEN 10 THEN 'Fast-track renewal negotiations. Document vendor dependencies and exit strategy.'
    ELSE 'Implement proactive monitoring and early warning systems. Regular status reviews with stakeholders.'
  END,
  CASE (seq % 4)
    WHEN 0 THEN 'Risk resolved through mitigation actions. Monitoring shows stable metrics.'
    WHEN 1 THEN 'Owner assigned and monitoring actively. Weekly review meetings scheduled.'
    WHEN 2 THEN 'Risk accepted by management with documented justification. Tracking in place.'
    ELSE 'Mitigation plan in progress. 60% complete with target date on track.'
  END,
  CASE 
    WHEN seq % 5 = 0 THEN 'security,compliance,high-priority'
    WHEN seq % 5 = 1 THEN 'infrastructure,performance,technical'
    WHEN seq % 5 = 2 THEN 'vendor,dependency,external'
    WHEN seq % 5 = 3 THEN 'resource,capacity,team'
    ELSE 'process,delivery,customer-impact'
  END,
  (SELECT id FROM profiles ORDER BY random() LIMIT 1)
FROM generate_series(1, 18) AS seq
WHERE EXISTS (SELECT 1 FROM programs LIMIT 1)
  AND EXISTS (SELECT 1 FROM program_increments LIMIT 1)
  AND EXISTS (SELECT 1 FROM profiles LIMIT 1)
ON CONFLICT (id) DO NOTHING;
```

---

## Incident Reports Seed (`supabase/seed-incidents-reports.sql`)

### Overview
- **42 Incidents** covering all severity levels (SEV1-SEV4)
- **6 SLA Breaches** + 4 At-Risk
- **6 Committees** with mixed voting states
- **18 Converted** to epics/features/stories
- **Severity/Priority Mismatches** for testing

### User Profiles

```sql
INSERT INTO incident_user_profiles (id, full_name, email, avatar_url, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sarah Chen', 'sarah.chen@example.com', NULL, true),
  ('22222222-2222-2222-2222-222222222222', 'Michael Torres', 'michael.torres@example.com', NULL, true),
  ('33333333-3333-3333-3333-333333333333', 'Emily Watson', 'emily.watson@example.com', NULL, true),
  ('44444444-4444-4444-4444-444444444444', 'David Kim', 'david.kim@example.com', NULL, true),
  ('55555555-5555-5555-5555-555555555555', 'Lisa Anderson', 'lisa.anderson@example.com', NULL, true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
```

### Release Versions

```sql
INSERT INTO release_versions (id, version, name, release_date, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v2.4.0', 'Phoenix Release', '2025-01-15', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'v2.3.1', 'Hotfix Release', '2025-01-01', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'v2.3.0', 'Dragon Release', '2024-12-15', 'released')
ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version;
```

### SEV1 Incidents (8 total)

```sql
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
```

### SEV2 Incidents (12 total)

```sql
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
   
  -- ... (more SEV2 incidents)
  
  -- SEV2 #12: Vetoed by committee
  ('inc-00020-0000-0000-0000-000000000020', 'INC-020', 
   'Proposed architecture change for caching layer', 
   'Redis to Memcached migration proposal.', 
   'SEV2', 'P2', 'closed', 'L2', false, 
   '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NULL, NULL, NULL);
```

### SLA Records

```sql
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
```

### Committees (6 total)

```sql
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

-- Committee 5: Approved (INC-007)
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at, decided_at)
VALUES ('comm-0005-0000-0000-0000-000000000005', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-007'), 
        'approved', 3, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days');

-- Committee 6: Vetoed (INC-020)
INSERT INTO incident_committees (id, incident_id, status, required_approvals, created_at, decided_at)
VALUES ('comm-0006-0000-0000-0000-000000000006', 
        (SELECT id FROM incidents WHERE incident_key = 'INC-020'), 
        'rejected', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

INSERT INTO committee_votes (committee_id, member_id, vote, voted_at, comment)
VALUES 
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0019-0000-0000-0000-000000000019', 'approved', NOW() - INTERVAL '4 days' - INTERVAL '3 hours', 'Reasonable approach'),
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0020-0000-0000-0000-000000000020', 'vetoed', NOW() - INTERVAL '4 days', 'VETO: Insufficient risk analysis. Redis has proven reliability in our stack. Migration introduces unnecessary risk without clear benefits. Recommend revisiting after Q2 stability review.'),
  ('comm-0006-0000-0000-0000-000000000006', 'cmem-0021-0000-0000-0000-000000000021', 'approved', NOW() - INTERVAL '4 days' - INTERVAL '1 hour', 'Worth exploring');
```

---

## Committee Seed (`supabase/seed-committees.sql`)

Mixed voting states for testing committee workflows:

```sql
-- Seed data for incident committees with mixed states
-- Run: Copy and paste into Supabase SQL Editor

DO $$
DECLARE
  inc1 UUID;
  inc2 UUID;
  inc3 UUID;
  inc4 UUID;
  inc5 UUID;
  inc6 UUID;
  comm1 UUID;
  comm2 UUID;
  comm3 UUID;
  comm4 UUID;
  user1 UUID;
  user2 UUID;
  user3 UUID;
  member1 UUID;
  member2 UUID;
  member3 UUID;
BEGIN
  -- Get first 6 incidents
  SELECT id INTO inc1 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO inc2 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO inc3 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO inc4 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO inc5 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 4;
  SELECT id INTO inc6 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 5;

  -- Get some user profiles
  SELECT id INTO user1 FROM incident_user_profiles LIMIT 1 OFFSET 0;
  SELECT id INTO user2 FROM incident_user_profiles LIMIT 1 OFFSET 1;
  SELECT id INTO user3 FROM incident_user_profiles LIMIT 1 OFFSET 2;

  -- 1. "Not applicable" - committee with 0 approvers (incidents 1 & 2)
  IF inc1 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc1, 'pending', 1)
    RETURNING id INTO comm1;
    
    UPDATE incidents SET committee_id = comm1 WHERE id = inc1;
  END IF;

  -- 2. "In progress" - committee with some pending votes (incidents 3 & 4)
  IF inc3 IS NOT NULL AND user1 IS NOT NULL AND user2 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc3, 'pending', 2)
    RETURNING id INTO comm3;
    
    UPDATE incidents SET committee_id = comm3 WHERE id = inc3;
    
    -- Add 2 members, 1 voted, 1 pending
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm3, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm3, user2, false, 'reviewer')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm3, member1, 'approved', NOW());
    
    INSERT INTO committee_votes (committee_id, member_id, vote)
    VALUES (comm3, member2, 'pending');
  END IF;

  -- 3. "Approved" - committee with majority approvals (incident 5)
  IF inc5 IS NOT NULL AND user1 IS NOT NULL AND user2 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc5, 'approved', 2)
    RETURNING id INTO comm4;
    
    UPDATE incidents SET committee_id = comm4 WHERE id = inc5;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user2, false, 'reviewer')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member1, 'approved', NOW() - INTERVAL '1 day');
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member2, 'approved', NOW() - INTERVAL '1 day');
  END IF;

  -- 4. "Rejected" with veto (incident 6)
  IF inc6 IS NOT NULL AND user1 IS NOT NULL AND user3 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc6, 'rejected', 2)
    RETURNING id INTO comm4;
    
    UPDATE incidents SET committee_id = comm4 WHERE id = inc6;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user3, true, 'veto_holder')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member1, 'approved', NOW() - INTERVAL '2 days');
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member2, 'vetoed', NOW() - INTERVAL '1 day');
  END IF;

  RAISE NOTICE 'Seed data inserted for committee states';
END $$;
```

---

## Planner Module Seed (`src/modules/planner/data/seedData.ts`)

### Users (7)

```typescript
export const SEED_USERS: PlannerUser[] = [
  { id: 'u1', name: 'Abdullah Alshammari', initials: 'AA', role: 'Investment Director', team: 't1', online: true },
  { id: 'u2', name: 'Sara Rahman', initials: 'SR', role: 'Senior Analyst', team: 't2', online: true },
  { id: 'u3', name: 'Mohammed Khan', initials: 'MK', role: 'Portfolio Manager', team: 't1', online: true },
  { id: 'u4', name: 'Fatima Al-Saud', initials: 'FS', role: 'Operations Lead', team: 't2', online: false },
  { id: 'u5', name: 'Ahmed Mansour', initials: 'AM', role: 'Operations Analyst', team: 't2', online: true },
  { id: 'u6', name: 'Nadia Qureshi', initials: 'NQ', role: 'Compliance Officer', team: 't3', online: false },
  { id: 'u7', name: 'Khalid Ibrahim', initials: 'KI', role: 'Risk Analyst', team: 't3', online: true },
];
```

### Teams (3)

```typescript
export const SEED_TEAMS: PlannerTeam[] = [
  { id: 't1', name: 'Investment Strategy', shortName: '📈 INV', memberCount: 2, color: '#2563eb' },
  { id: 't2', name: 'Portfolio Operations', shortName: '⚙️ OPS', memberCount: 3, color: '#0d9488' },
  { id: 't3', name: 'Compliance & Risk', shortName: '🛡️ C&R', memberCount: 2, color: '#7c3aed' },
];
```

### Tasks (14)

```typescript
export const SEED_TASKS: PlannerTask[] = [
  {
    id: 'seed-001',
    key: 'PLN-001',
    title: 'Review Q4 budget proposals',
    description: 'Analyze and approve Q4 budget allocations for all departments',
    status: 'done',
    type: 'task',
    priority: 'medium',
    assigneeId: 'u1',
    assigneeName: 'Abdullah Alshammari',
    teamId: 't1',
    startDate: '2026-01-06',
    dueDate: '2026-01-10',
    blocked: false,
    progress: 100,
    tags: ['finance', 'quarterly'],
  },
  // ... 13 more tasks with various statuses, priorities, and blocked states
  {
    id: 'seed-006',
    key: 'PLN-006',
    title: 'Integrate payment gateway',
    description: 'Connect Stripe payment processing to platform',
    status: 'in-progress',
    type: 'task',
    priority: 'critical',
    blocked: true,
    blockedReason: 'Awaiting security team approval for third-party API integration.',
    progress: 30,
    tags: ['integration', 'payment', 'critical'],
  },
  // ...
];
```

### AI Insights (5)

```typescript
export const SEED_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'ai1',
    type: 'critical',
    title: 'Payment Gateway Blocked',
    message: 'PLN-006 has been blocked for 5 days awaiting security approval.',
    action: 'Escalate to Security Lead',
    taskId: 'PLN-006',
  },
  {
    id: 'ai2',
    type: 'warning',
    title: 'Workload Imbalance',
    message: 'Abdullah has 40% more tasks than team average this sprint.',
    action: 'Rebalance Workload',
  },
  // ... 3 more insights
];
```

---

## Migration-Embedded Lookup Data

### Resource Roles

```sql
-- From: supabase/migrations/20251213224653_e9e52c31-8719-4920-a3f3-3c0f0dc51d7d.sql
INSERT INTO public.resource_roles (code, name, sort_order) VALUES
  ('PO', 'Product Owner', 10),
  ('BA', 'Business Analyst', 20),
  ('TPO', 'Technical Product Owner', 30),
  ('UX', 'UI/UX Designer', 40),
  ('FE', 'Front-end Developer', 50),
  ('BE', 'Back-end Developer', 60),
  ('QA', 'QA Tester', 70),
  ('PM', 'Project Manager', 80),
  ('PDM', 'Product Manager', 90),
  ('SM', 'Scrum Master', 100),
  ('EM', 'Engineering Manager', 110),
  ('SA', 'Solution Architect', 120),
  ('DBA', 'Database Admin', 130),
  ('DO', 'DevOps Engineer', 140),
  ('SE', 'Security Engineer', 150)
ON CONFLICT (code) DO NOTHING;
```

### Business Processes

```sql
-- From: supabase/migrations/20251213215316_030cb07d-409f-4eaa-a0f7-556f0f5e5e15.sql
INSERT INTO public.business_processes (name_en, active, sort_order) VALUES
  ('Standard Incentive', true, 1),
  ('Joining the Factories of the Future Program', true, 2),
  ('Fourth Industrial Revolution Program Grant', true, 3),
  ('Issuance of Industrial License', true, 4),
  ('Modify Industrial License', true, 5),
  ('Renew Industrial License', true, 6),
  ('Labor Enablement', true, 7),
  ('Transfer Ownership', true, 8),
  ('Cancel Industrial License', true, 9),
  ('Customs Exemption for Raw Materials', true, 10),
  ('Customs Exemption for Equipment and Spare Parts', true, 11),
  ('Customs Exemption for Additional Raw Materials', true, 12),
  ('Qualification of Local Product', true, 13),
  ('Priority for Government Procurement', true, 14)
ON CONFLICT DO NOTHING;
```

### Demand Process Steps

```sql
-- From: supabase/migrations/20251214134436_cff20218-2968-43fd-94d6-7f5524b3a4a4.sql
INSERT INTO public.demand_process_steps (value, label, sort_order) VALUES
  ('new_request', 'New request', 1),
  ('new_demand', 'New demand', 2),
  ('in_review', 'In review', 3),
  ('analyse', 'Analyse', 4),
  ('approved', 'Approved', 5),
  ('ready_to_implement', 'Ready to implement', 6),
  ('implement', 'Implement', 7),
  ('closed', 'Closed', 8),
  ('rejected', 'Rejected', 9),
  ('on_hold', 'On hold', 10)
ON CONFLICT (value) DO NOTHING;
```

---

## Production Cleanup

Before deploying to production, execute this cleanup to remove all seeded data while preserving admin configuration:

```sql
-- ============================================================================
-- PRODUCTION CLEANUP SCRIPT
-- Removes all seeded test data while preserving admin configuration
-- ============================================================================

-- Delete incident-related data
DELETE FROM committee_votes;
DELETE FROM committee_members;
DELETE FROM incident_committees;
DELETE FROM sla_records;
DELETE FROM incidents;
DELETE FROM incident_user_profiles WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Delete dependency data
DELETE FROM work_item_links WHERE id LIKE 'link-%';
DELETE FROM dependency_negotiations WHERE id LIKE 'neg-%';
DELETE FROM dependencies WHERE id LIKE 'dep-%';
DELETE FROM external_entities WHERE id LIKE 'ext-%';

-- Delete risk data
DELETE FROM risks WHERE id LIKE 'risk-%';

-- Delete release versions (if seeded)
DELETE FROM release_versions WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- PRESERVE these admin tables:
-- - departments
-- - business_owners
-- - demand_process_steps
-- - resource_roles
-- - business_processes
-- - option_sets
```

---

## Notes

1. **Execution Order**: Run seed files in this order:
   1. `seed.sql` (Dependencies + Risks)
   2. `seed-incidents-reports.sql` (Incidents + SLA + Committees)
   3. `seed-committees.sql` (Additional committee states)

2. **Prerequisites**: Seed files assume existence of:
   - `profiles` table with user data
   - `programs` and `program_increments` tables
   - `teams` and `features` tables
   - `iterations` (sprints) table

3. **Idempotency**: All seed files use `ON CONFLICT DO NOTHING` to prevent duplicate key errors on re-runs.
