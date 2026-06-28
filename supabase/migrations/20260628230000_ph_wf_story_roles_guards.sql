-- Story v1 transition ROLES + GUARDS (reproducible, additive, idempotent).
-- Advisory only — seeds the rules the runtime records in audit; blocking not enabled.
DO $$
DECLARE v_version uuid;
BEGIN
  SELECT id INTO v_version FROM ph_wf_versions
   WHERE entity_key='story' AND lifecycle='published' ORDER BY version_no DESC LIMIT 1;
  IF v_version IS NULL THEN RAISE NOTICE 'no story version'; RETURN; END IF;

  -- ROLES: map role_group(s) per transition (by from/to key). allow_assignee/reporter flags.
  -- helper: insert role rule for a transition resolved by from/to keys
  -- (transitions are unique by (version, from, to))
  INSERT INTO ph_wf_transition_roles (transition_id, role_group, allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason)
  SELECT t.id, x.role_group, x.allow_assignee, x.allow_reporter, true, true
  FROM (VALUES
    -- planning / refinement / readiness -> product_owner
    ('backlog','refinement','product_owner',false,false),
    ('refinement','ready_for_dev','product_owner',false,false),
    -- into development / code review -> team_lead (+assignee on dev)
    ('ready_for_dev','in_development','team_lead',true,false),
    ('ready_for_dev','in_development','developer',true,false),
    ('in_development','code_review','developer',true,false),
    ('in_development','code_review','team_lead',false,false),
    ('code_review','ready_for_qa','team_lead',false,false),
    -- QA statuses -> qa_lead / qa_tester
    ('ready_for_qa','qa_testing','qa_tester',false,false),
    ('ready_for_qa','qa_testing','qa_lead',false,false),
    ('qa_testing','qa_passed','qa_lead',false,false),
    ('qa_testing','qa_failed','qa_tester',false,false),
    ('qa_failed','in_development','developer',true,false),
    -- UAT statuses -> business_user
    ('qa_passed','uat_ready','qa_lead',false,false),
    ('uat_ready','in_uat','business_user',false,false),
    ('in_uat','uat_accepted','business_user',false,false),
    ('in_uat','uat_failed','business_user',false,false),
    ('uat_failed','in_development','developer',true,false),
    -- release -> release_manager
    ('uat_accepted','ready_for_release','release_manager',false,false),
    ('ready_for_release','done','release_manager',false,false),
    -- global exceptions: blocked/canceled by team_lead/product_owner + assignee
    ('__any__','blocked','team_lead',true,true),
    ('blocked','in_development','team_lead',true,false),
    ('__any__','canceled','product_owner',false,true),
    ('done','reopened','qa_lead',false,false),
    ('reopened','in_development','developer',true,false)
  ) AS x(from_key,to_key,role_group,allow_assignee,allow_reporter)
  JOIN ph_wf_version_transitions t
    ON t.version_id=v_version AND t.to_status_key=x.to_key
   AND (t.from_status_key=NULLIF(x.from_key,'__any__') OR (x.from_key='__any__' AND t.from_status_key IS NULL))
  ON CONFLICT (transition_id, role_group) DO NOTHING;

  -- GUARDS: required conditions per transition (advisory; is_blocking flag set for future)
  INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
  SELECT t.id, x.guard_type, '{}'::jsonb, x.is_blocking, x.waiver
  FROM (VALUES
    ('refinement','ready_for_dev','acceptance_criteria_present',true,false),
    ('ready_for_dev','in_development','assignee_required',true,false),
    ('code_review','ready_for_qa','child_completion',true,true),
    ('ready_for_qa','qa_testing','test_coverage',true,true),
    ('qa_testing','qa_passed','qa_signoff',true,false),
    ('in_uat','uat_accepted','uat_signoff',true,false),
    ('uat_accepted','ready_for_release','release_readiness',true,true),
    ('uat_accepted','ready_for_release','no_open_blocker_critical',true,true),
    ('qa_testing','qa_failed','reason_required',true,false),
    ('in_uat','uat_failed','reason_required',true,false),
    ('__any__','blocked','reason_required',true,false),
    ('__any__','canceled','reason_required',true,false),
    ('done','reopened','reason_required',true,false)
  ) AS x(from_key,to_key,guard_type,is_blocking,waiver)
  JOIN ph_wf_version_transitions t
    ON t.version_id=v_version AND t.to_status_key=x.to_key
   AND (t.from_status_key=NULLIF(x.from_key,'__any__') OR (x.from_key='__any__' AND t.from_status_key IS NULL))
  ON CONFLICT DO NOTHING;
END $$;
