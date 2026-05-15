-- Add educational metadata columns to catalyst_workflow_statuses
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS entry_criteria TEXT;
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS exit_criteria TEXT;
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS expected_outputs TEXT;
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS impacted_roles TEXT[];
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS activities TEXT[];
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS backward_routes TEXT[];
ALTER TABLE catalyst_workflow_statuses ADD COLUMN IF NOT EXISTS next_movements TEXT[];

-- Create BR workflow scheme (idempotent)
DO $$
DECLARE
  v_scheme_id UUID := 'bb000001-0000-0000-0000-000000000001';
  s1 UUID := 'bb000001-0001-0000-0000-000000000001';
  s2 UUID := 'bb000001-0002-0000-0000-000000000001';
  s3 UUID := 'bb000001-0003-0000-0000-000000000001';
  s4 UUID := 'bb000001-0004-0000-0000-000000000001';
  s5 UUID := 'bb000001-0005-0000-0000-000000000001';
  s6 UUID := 'bb000001-0006-0000-0000-000000000001';
  s7 UUID := 'bb000001-0007-0000-0000-000000000001';
  s8 UUID := 'bb000001-0008-0000-0000-000000000001';
  s9 UUID := 'bb000001-0009-0000-0000-000000000001';
  s10 UUID := 'bb000001-0010-0000-0000-000000000001';
  s11 UUID := 'bb000001-0011-0000-0000-000000000001';
BEGIN
  -- Skip if scheme already exists
  IF EXISTS (SELECT 1 FROM catalyst_workflow_schemes WHERE id = v_scheme_id) THEN
    RAISE NOTICE 'BR workflow scheme already exists, skipping.';
    RETURN;
  END IF;

  INSERT INTO catalyst_workflow_schemes (id, name, description, issue_type, is_active, is_default)
  VALUES (
    v_scheme_id,
    'Business Request Workflow',
    'Educational 11-status workflow for business requests with Senaei BAU model',
    'business-request',
    true,
    false
  );

  INSERT INTO catalyst_workflow_statuses (id, scheme_id, name, slug, category, color, position, is_initial, is_final, is_active, wip_limit, slug_aliases, owner_name, entry_criteria, exit_criteria, expected_outputs, impacted_roles, activities, risks, backward_routes, next_movements)
  VALUES
    (s1, v_scheme_id, 'Funnel', 'funnel', 'todo', '#42526E', 1, true, false, true, NULL, ARRAY[]::TEXT[], 'Khaled', 'Opportunity identified', 'Pre-qualification complete', 'Opportunity summary, initial feasibility', ARRAY['Business Development', 'Portfolio Manager'], ARRAY['Opportunity screening', 'Initial assessment'], 'Opportunity may not meet criteria', ARRAY[]::TEXT[], ARRAY['demand_intake']),
    (s2, v_scheme_id, 'Demand Intake', 'demand_intake', 'todo', '#5243AA', 2, false, false, true, NULL, ARRAY[]::TEXT[], 'Nada Alfassam', 'Approved from Funnel', 'Intake review complete', 'Intake form, requirements snapshot', ARRAY['Portfolio Manager', 'Product Owner'], ARRAY['Requirements gathering', 'Initial scoping'], 'Requirements unclear or conflicting', ARRAY['funnel']::TEXT[], ARRAY['analysis_design']),
    (s3, v_scheme_id, 'Analysis & Design', 'analysis_design', 'in_progress', '#0052CC', 3, false, false, true, NULL, ARRAY[]::TEXT[], 'Ahmed Basudan', 'Requirements approved', 'Design review approved', 'Design document, wireframes, technical spec', ARRAY['Product Designer', 'Technical Architect'], ARRAY['Design kickoff', 'Prototyping', 'Review sessions'], 'Design complexity may impact timeline', ARRAY['demand_intake']::TEXT[], ARRAY['product_validation']),
    (s4, v_scheme_id, 'Product Validation', 'product_validation', 'in_progress', '#FF991F', 4, false, false, true, NULL, ARRAY[]::TEXT[], 'Mohamed Fathi', 'Design approved', 'Validation feedback received', 'User feedback, validation report', ARRAY['Product Manager', 'UX Researcher'], ARRAY['User testing', 'Feedback consolidation'], 'User feedback may require design changes', ARRAY['analysis_design']::TEXT[], ARRAY['pending_approval']),
    (s5, v_scheme_id, 'Pending Approval', 'pending_approval', 'todo', '#FFAB00', 5, false, false, true, NULL, ARRAY[]::TEXT[], 'Abu Yasir', 'All validations complete', 'Executive approval obtained', 'Approval memo, budget sign-off', ARRAY['Executive Sponsor', 'Finance'], ARRAY['Approval review', 'Budget confirmation'], 'Budget constraints may delay approval', ARRAY['product_validation']::TEXT[], ARRAY['ready_implementation']),
    (s6, v_scheme_id, 'Ready for Implementation', 'ready_implementation', 'in_progress', '#36B37E', 6, false, false, true, NULL, ARRAY[]::TEXT[], 'Hasan (BE) / Imran (FE)', 'Approved by executive', 'Implementation plan documented', 'Feature scope document, story map', ARRAY['Tech Lead', 'Product Manager'], ARRAY['Story creation', 'Sprint planning', 'Resource allocation'], 'Resource unavailability may delay start', ARRAY['pending_approval']::TEXT[], ARRAY['implementation']),
    (s7, v_scheme_id, 'Implementation', 'implementation', 'in_progress', '#0055CC', 7, false, false, true, NULL, ARRAY[]::TEXT[], 'Implementation Team', 'Sprint ready', 'Code complete and merged', 'Working feature, merged to main', ARRAY['Engineers', 'Tech Lead'], ARRAY['Development', 'Code review', 'Testing'], 'Technical blockers may delay completion', ARRAY['ready_implementation']::TEXT[], ARRAY['review_qa']),
    (s8, v_scheme_id, 'Review & QA', 'review_qa', 'in_progress', '#FF991F', 8, false, false, true, NULL, ARRAY[]::TEXT[], 'Yazeed Daraz', 'Feature complete', 'All QA tests pass', 'Test report, quality sign-off', ARRAY['QA Engineer', 'Test Manager'], ARRAY['Functional testing', 'Regression testing', 'Performance testing'], 'Critical bugs may require rework', ARRAY['implementation']::TEXT[], ARRAY['uat']),
    (s9, v_scheme_id, 'UAT', 'uat', 'in_progress', '#00875A', 9, false, false, true, NULL, ARRAY[]::TEXT[], 'Business User', 'QA approved', 'Business user sign-off', 'UAT report, business approval', ARRAY['Business User', 'Product Owner'], ARRAY['User acceptance testing', 'Feedback collection'], 'Users may request changes', ARRAY['review_qa']::TEXT[], ARRAY['ready_production']),
    (s10, v_scheme_id, 'Ready for Production', 'ready_production', 'done', '#006644', 10, false, false, true, NULL, ARRAY[]::TEXT[], 'Dalia Abdullah / Arslaan', 'UAT complete', 'Release notes prepared', 'Release notes, deployment checklist', ARRAY['Release Manager', 'DevOps'], ARRAY['Release preparation', 'Deployment planning'], 'Production environment issues may delay release', ARRAY['uat']::TEXT[], ARRAY['done']),
    (s11, v_scheme_id, 'Done', 'done', 'done', '#00875A', 11, false, true, true, NULL, ARRAY[]::TEXT[], 'Ahad', 'Released to production', 'Feature live and stable', 'Feature in production, monitoring in place', ARRAY['Product Manager', 'Support Team'], ARRAY['Production monitoring', 'Issue response'], 'Production incidents may require rollback', ARRAY['ready_production']::TEXT[], ARRAY[]::TEXT[]);

  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
  VALUES
    (v_scheme_id, 'Move to Demand Intake', s1, s2, false, 1),
    (v_scheme_id, 'Move to Analysis & Design', s2, s3, false, 2),
    (v_scheme_id, 'Move to Product Validation', s3, s4, false, 3),
    (v_scheme_id, 'Move to Pending Approval', s4, s5, false, 4),
    (v_scheme_id, 'Move to Ready for Implementation', s5, s6, false, 5),
    (v_scheme_id, 'Move to Implementation', s6, s7, false, 6),
    (v_scheme_id, 'Move to Review & QA', s7, s8, false, 7),
    (v_scheme_id, 'Move to UAT', s8, s9, false, 8),
    (v_scheme_id, 'Move to Ready for Production', s9, s10, false, 9),
    (v_scheme_id, 'Move to Done', s10, s11, false, 10),
    (v_scheme_id, 'Move back to Funnel', s2, s1, false, 11),
    (v_scheme_id, 'Move back to Demand Intake', s3, s2, false, 12),
    (v_scheme_id, 'Move back to Analysis & Design', s4, s3, false, 13),
    (v_scheme_id, 'Move back to Product Validation', s5, s4, false, 14),
    (v_scheme_id, 'Move back to Pending Approval', s6, s5, false, 15),
    (v_scheme_id, 'Move back to Ready for Implementation', s7, s6, false, 16),
    (v_scheme_id, 'Move back to Implementation', s8, s7, false, 17),
    (v_scheme_id, 'Move back to Review & QA', s9, s8, false, 18),
    (v_scheme_id, 'Move back to UAT', s10, s9, false, 19);
END $$;
