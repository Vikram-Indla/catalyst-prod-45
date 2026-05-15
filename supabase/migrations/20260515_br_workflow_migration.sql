-- Add educational metadata columns to catalyst_workflow_statuses
ALTER TABLE catalyst_workflow_statuses ADD COLUMN (
  owner_name VARCHAR(255),
  entry_criteria TEXT,
  exit_criteria TEXT,
  expected_outputs TEXT,
  impacted_roles TEXT[],
  activities TEXT[],
  risks TEXT,
  backward_routes TEXT[],
  next_movements TEXT[]
);

-- Create BR workflow scheme
INSERT INTO catalyst_workflow_schemes (id, name, description, issue_type, is_active, is_default)
VALUES (
  'br-main-scheme',
  'Business Request Workflow',
  'Educational 11-status workflow for business requests with Senaei BAU model',
  'business-request',
  true,
  true
);

-- Seed 11 BR statuses with educational metadata
INSERT INTO catalyst_workflow_statuses (
  id, scheme_id, name, slug, category, color, position, is_initial, is_final, is_active,
  wip_limit, slug_aliases, owner_name, entry_criteria, exit_criteria, expected_outputs,
  impacted_roles, activities, risks, backward_routes, next_movements
) VALUES
  -- 1. Funnel
  ('br-status-1', 'br-main-scheme', 'Funnel', 'funnel', 'todo', '#42526E', 1, true, false, true,
   NULL, ARRAY[]::TEXT[], 'Khaled',
   'Opportunity identified', 'Pre-qualification complete',
   'Opportunity summary, initial feasibility',
   ARRAY['Business Development', 'Portfolio Manager'],
   ARRAY['Opportunity screening', 'Initial assessment'],
   'Opportunity may not meet criteria',
   ARRAY[]::TEXT[], ARRAY['demand_intake']),

  -- 2. Demand Intake
  ('br-status-2', 'br-main-scheme', 'Demand Intake', 'demand_intake', 'todo', '#5243AA', 2, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Nada Alfassam',
   'Approved from Funnel', 'Intake review complete',
   'Intake form, requirements snapshot',
   ARRAY['Portfolio Manager', 'Product Owner'],
   ARRAY['Requirements gathering', 'Initial scoping'],
   'Requirements unclear or conflicting',
   ARRAY['funnel']::TEXT[], ARRAY['analysis_design']),

  -- 3. Analysis & Design
  ('br-status-3', 'br-main-scheme', 'Analysis & Design', 'analysis_design', 'in_progress', '#0052CC', 3, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Ahmed Basudan',
   'Requirements approved', 'Design review approved',
   'Design document, wireframes, technical spec',
   ARRAY['Product Designer', 'Technical Architect'],
   ARRAY['Design kickoff', 'Prototyping', 'Review sessions'],
   'Design complexity may impact timeline',
   ARRAY['demand_intake']::TEXT[], ARRAY['product_validation']),

  -- 4. Product Validation
  ('br-status-4', 'br-main-scheme', 'Product Validation', 'product_validation', 'in_progress', '#FF991F', 4, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Mohamed Fathi',
   'Design approved', 'Validation feedback received',
   'User feedback, validation report',
   ARRAY['Product Manager', 'UX Researcher'],
   ARRAY['User testing', 'Feedback consolidation'],
   'User feedback may require design changes',
   ARRAY['analysis_design']::TEXT[], ARRAY['pending_approval']),

  -- 5. Pending Approval
  ('br-status-5', 'br-main-scheme', 'Pending Approval', 'pending_approval', 'todo', '#FFAB00', 5, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Abu Yasir',
   'All validations complete', 'Executive approval obtained',
   'Approval memo, budget sign-off',
   ARRAY['Executive Sponsor', 'Finance'],
   ARRAY['Approval review', 'Budget confirmation'],
   'Budget constraints may delay approval',
   ARRAY['product_validation']::TEXT[], ARRAY['ready_implementation']),

  -- 6. Ready for Implementation
  ('br-status-6', 'br-main-scheme', 'Ready for Implementation', 'ready_implementation', 'in_progress', '#36B37E', 6, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Hasan (BE) / Imran (FE)',
   'Approved by executive', 'Implementation plan documented',
   'Feature scope document, story map',
   ARRAY['Tech Lead', 'Product Manager'],
   ARRAY['Story creation', 'Sprint planning', 'Resource allocation'],
   'Resource unavailability may delay start',
   ARRAY['pending_approval']::TEXT[], ARRAY['implementation']),

  -- 7. Implementation
  ('br-status-7', 'br-main-scheme', 'Implementation', 'implementation', 'in_progress', '#0055CC', 7, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Implementation Team',
   'Sprint ready', 'Code complete and merged',
   'Working feature, merged to main',
   ARRAY['Engineers', 'Tech Lead'],
   ARRAY['Development', 'Code review', 'Testing'],
   'Technical blockers may delay completion',
   ARRAY['ready_implementation']::TEXT[], ARRAY['review_qa']),

  -- 8. Review & QA
  ('br-status-8', 'br-main-scheme', 'Review & QA', 'review_qa', 'in_progress', '#FF991F', 8, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Yazeed Daraz',
   'Feature complete', 'All QA tests pass',
   'Test report, quality sign-off',
   ARRAY['QA Engineer', 'Test Manager'],
   ARRAY['Functional testing', 'Regression testing', 'Performance testing'],
   'Critical bugs may require rework',
   ARRAY['implementation']::TEXT[], ARRAY['uat']),

  -- 9. UAT
  ('br-status-9', 'br-main-scheme', 'UAT', 'uat', 'in_progress', '#00875A', 9, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Business User',
   'QA approved', 'Business user sign-off',
   'UAT report, business approval',
   ARRAY['Business User', 'Product Owner'],
   ARRAY['User acceptance testing', 'Feedback collection'],
   'Users may request changes',
   ARRAY['review_qa']::TEXT[], ARRAY['ready_production']),

  -- 10. Ready for Production
  ('br-status-10', 'br-main-scheme', 'Ready for Production', 'ready_production', 'done', '#006644', 10, false, false, true,
   NULL, ARRAY[]::TEXT[], 'Dalia Abdullah / Arslaan',
   'UAT complete', 'Release notes prepared',
   'Release notes, deployment checklist',
   ARRAY['Release Manager', 'DevOps'],
   ARRAY['Release preparation', 'Deployment planning'],
   'Production environment issues may delay release',
   ARRAY['uat']::TEXT[], ARRAY['done']),

  -- 11. Done
  ('br-status-11', 'br-main-scheme', 'Done', 'done', 'done', '#00875A', 11, false, true, true,
   NULL, ARRAY[]::TEXT[], 'Ahad',
   'Released to production', 'Feature live and stable',
   'Feature in production, monitoring in place',
   ARRAY['Product Manager', 'Support Team'],
   ARRAY['Production monitoring', 'Issue response'],
   'Production incidents may require rollback',
   ARRAY['ready_production']::TEXT[], ARRAY[]::TEXT[]);

-- Create transitions (anyone can move; adjacent backward allowed per "informing" intent)
INSERT INTO catalyst_workflow_transitions (id, scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
VALUES
  -- Forward transitions (primary path)
  ('br-trans-1-2', 'br-main-scheme', 'Move to Demand Intake', 'br-status-1', 'br-status-2', false, 1),
  ('br-trans-2-3', 'br-main-scheme', 'Move to Analysis & Design', 'br-status-2', 'br-status-3', false, 2),
  ('br-trans-3-4', 'br-main-scheme', 'Move to Product Validation', 'br-status-3', 'br-status-4', false, 3),
  ('br-trans-4-5', 'br-main-scheme', 'Move to Pending Approval', 'br-status-4', 'br-status-5', false, 4),
  ('br-trans-5-6', 'br-main-scheme', 'Move to Ready for Implementation', 'br-status-5', 'br-status-6', false, 5),
  ('br-trans-6-7', 'br-main-scheme', 'Move to Implementation', 'br-status-6', 'br-status-7', false, 6),
  ('br-trans-7-8', 'br-main-scheme', 'Move to Review & QA', 'br-status-7', 'br-status-8', false, 7),
  ('br-trans-8-9', 'br-main-scheme', 'Move to UAT', 'br-status-8', 'br-status-9', false, 8),
  ('br-trans-9-10', 'br-main-scheme', 'Move to Ready for Production', 'br-status-9', 'br-status-10', false, 9),
  ('br-trans-10-11', 'br-main-scheme', 'Move to Done', 'br-status-10', 'br-status-11', false, 10),

  -- Adjacent backward transitions (Funnel ↔ Demand Intake, etc.)
  ('br-trans-2-1', 'br-main-scheme', 'Move back to Funnel', 'br-status-2', 'br-status-1', false, 11),
  ('br-trans-3-2', 'br-main-scheme', 'Move back to Demand Intake', 'br-status-3', 'br-status-2', false, 12),
  ('br-trans-4-3', 'br-main-scheme', 'Move back to Analysis & Design', 'br-status-4', 'br-status-3', false, 13),
  ('br-trans-5-4', 'br-main-scheme', 'Move back to Product Validation', 'br-status-5', 'br-status-4', false, 14),
  ('br-trans-6-5', 'br-main-scheme', 'Move back to Pending Approval', 'br-status-6', 'br-status-5', false, 15),
  ('br-trans-7-6', 'br-main-scheme', 'Move back to Ready for Implementation', 'br-status-7', 'br-status-6', false, 16),
  ('br-trans-8-7', 'br-main-scheme', 'Move back to Implementation', 'br-status-8', 'br-status-7', false, 17),
  ('br-trans-9-8', 'br-main-scheme', 'Move back to Review & QA', 'br-status-9', 'br-status-8', false, 18),
  ('br-trans-10-9', 'br-main-scheme', 'Move back to UAT', 'br-status-10', 'br-status-9', false, 19);
