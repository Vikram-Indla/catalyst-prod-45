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
