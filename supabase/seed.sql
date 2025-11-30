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

-- Dependency audit log entries are automatically created via trigger
-- when dependencies are created/updated, so no manual seed needed

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
