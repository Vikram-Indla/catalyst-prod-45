-- Native ph_issues expansion: Feature v1 + Sub-task v1 full seed + Epic roles/guards.
-- Additive + idempotent. Advisory (no enforcement rows). Adds entries to the
-- Default Canonical Scheme. Staging only. Production untouched.
DO $$
DECLARE
  v_scheme uuid;
  v_tmpl   uuid;
  v_feat   uuid;
  v_sub    uuid;
  v_epic   uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;

  -- ───────────────────────── EPIC: add role rules + reason guards ─────────────
  SELECT id INTO v_epic FROM ph_wf_versions WHERE entity_key='epic' AND lifecycle='published' ORDER BY version_no DESC LIMIT 1;
  IF v_epic IS NOT NULL THEN
    INSERT INTO ph_wf_transition_roles (transition_id, role_group, allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason)
    SELECT t.id, x.rg, false, false, true, true FROM (VALUES
      ('backlog','discovery','product_owner'),('discovery','ready_for_breakdown','product_owner'),
      ('ready_for_breakdown','committed','product_owner'),('committed','in_delivery','team_lead'),
      ('in_delivery','in_validation','qa_lead'),('in_validation','ready_for_release','release_manager'),
      ('ready_for_release','released','release_manager'),('released','closed','product_owner'),
      ('__any__','on_hold','team_lead'),('on_hold','in_delivery','team_lead'),('__any__','canceled','product_owner')
    ) AS x(fk,tk,rg)
    JOIN ph_wf_version_transitions t ON t.version_id=v_epic AND t.to_status_key=x.tk
     AND (t.from_status_key=NULLIF(x.fk,'__any__') OR (x.fk='__any__' AND t.from_status_key IS NULL))
    ON CONFLICT (transition_id, role_group) DO NOTHING;

    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t
    WHERE t.version_id=v_epic AND t.to_status_key IN ('on_hold','canceled')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ───────────────────────── SUB-TASK v1 ─────────────────────────────────────
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Sub-task' AND name='Sub-task SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Sub-task SDLC','Sub-task','Canonical Sub-task lifecycle', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_sub FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='subtask' AND version_no=1;
  IF v_sub IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'subtask',1,'published',now(),'Canonical Sub-task workflow v1') RETURNING id INTO v_sub;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_sub,'to_do','To Do','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_sub,'assigned','Assigned','todo','plan',20,'color.background.neutral',false,false,false,false,false),
      (v_sub,'in_progress','In Progress','in_progress','build',30,'color.background.information',false,false,false,false,false),
      (v_sub,'blocked','Blocked','in_progress','exception',40,'color.background.warning',false,false,true,false,true),
      (v_sub,'code_review','Code Review','in_progress','build',50,'color.background.information',false,false,false,false,false),
      (v_sub,'done','Done','done','closed',60,'color.background.success',false,true,false,true,false),
      (v_sub,'canceled','Canceled','done','terminal',70,'color.background.danger',false,true,false,false,true);
    INSERT INTO ph_wf_version_transitions
      (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_sub,'to_do','assigned','forward',false,10),(v_sub,'assigned','in_progress','forward',false,20),
      (v_sub,'in_progress','code_review','forward',false,30),(v_sub,'code_review','done','forward',false,40),
      (v_sub,NULL,'blocked','exception',true,50),(v_sub,'blocked','in_progress','backward',true,60),
      (v_sub,NULL,'canceled','cancel',true,70);
    INSERT INTO ph_wf_transition_roles (transition_id, role_group, allow_assignee, allow_super_admin_bypass, bypass_requires_reason)
    SELECT t.id, x.rg, x.aa, true, true FROM (VALUES
      ('to_do','assigned','team_lead',false),('assigned','in_progress','developer',true),
      ('in_progress','code_review','developer',true),('code_review','done','team_lead',false),
      ('__any__','blocked','developer',true),('blocked','in_progress','developer',true),('__any__','canceled','team_lead',false)
    ) AS x(fk,tk,rg,aa)
    JOIN ph_wf_version_transitions t ON t.version_id=v_sub AND t.to_status_key=x.tk
     AND (t.from_status_key=NULLIF(x.fk,'__any__') OR (x.fk='__any__' AND t.from_status_key IS NULL));
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'assignee_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_sub AND t.from_status_key='assigned' AND t.to_status_key='in_progress'
    UNION ALL
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_sub AND t.to_status_key IN ('blocked','canceled');
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'subtask',v_sub)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_sub,'subtask','To Do','to_do','confident'),(v_sub,'subtask','Backlog','to_do','confident'),
    (v_sub,'subtask','In Progress','in_progress','confident'),(v_sub,'subtask','Done','done','confident'),
    (v_sub,'subtask','Resolved','done','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;

  -- ───────────────────────── FEATURE v1 ──────────────────────────────────────
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Feature' AND name='Feature SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Feature SDLC','Feature','Canonical Feature delivery lifecycle', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_feat FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='feature' AND version_no=1;
  IF v_feat IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'feature',1,'published',now(),'Canonical Feature workflow v1') RETURNING id INTO v_feat;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_feat,'identified','Identified','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_feat,'requirements','Requirements','in_progress','shaping',20,'color.background.information',false,false,false,false,false),
      (v_feat,'design','Design','in_progress','shaping',30,'color.background.information',false,false,false,false,false),
      (v_feat,'ready_for_dev','Ready for Development','todo','build',40,'color.background.neutral',false,false,false,false,false),
      (v_feat,'in_development','In Development','in_progress','build',50,'color.background.information',false,false,false,false,false),
      (v_feat,'code_review','Code Review','in_progress','build',60,'color.background.information',false,false,false,false,false),
      (v_feat,'in_integration','In Integration','in_progress','build',70,'color.background.information',false,false,false,false,false),
      (v_feat,'ready_for_qa','Ready for QA','in_progress','verify',80,'color.background.information',false,false,false,false,false),
      (v_feat,'qa_testing','QA Testing','in_progress','verify',90,'color.background.information',false,false,false,false,false),
      (v_feat,'qa_passed','QA Passed','in_progress','verify',100,'color.background.information',false,false,false,false,false),
      (v_feat,'uat_ready','UAT Ready','in_progress','uat',110,'color.background.information',false,false,false,false,false),
      (v_feat,'in_uat','In UAT','in_progress','uat',120,'color.background.information',false,false,false,false,false),
      (v_feat,'uat_accepted','UAT Accepted','in_progress','uat',130,'color.background.information',false,false,false,false,false),
      (v_feat,'ready_for_release','Ready for Release','in_progress','release',140,'color.background.information',false,false,false,false,false),
      (v_feat,'released','Released','done','release',150,'color.background.success',false,false,false,false,false),
      (v_feat,'closed','Closed','done','closed',160,'color.background.success',false,true,false,true,false),
      (v_feat,'blocked','Blocked','in_progress','exception',170,'color.background.warning',false,false,true,false,true),
      (v_feat,'canceled','Canceled','done','terminal',180,'color.background.danger',false,true,false,false,true),
      (v_feat,'reopened','Reopened','todo','reopen',190,'color.background.information',false,false,false,true,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_feat,'identified','requirements','forward',false,10),(v_feat,'requirements','design','forward',false,20),
      (v_feat,'design','ready_for_dev','forward',false,30),(v_feat,'ready_for_dev','in_development','forward',false,40),
      (v_feat,'in_development','code_review','forward',false,50),(v_feat,'code_review','in_integration','forward',false,60),
      (v_feat,'in_integration','ready_for_qa','forward',false,70),(v_feat,'ready_for_qa','qa_testing','forward',false,80),
      (v_feat,'qa_testing','qa_passed','forward',false,90),(v_feat,'qa_passed','uat_ready','forward',false,100),
      (v_feat,'uat_ready','in_uat','forward',false,110),(v_feat,'in_uat','uat_accepted','forward',false,120),
      (v_feat,'uat_accepted','ready_for_release','forward',false,130),(v_feat,'ready_for_release','released','forward',false,140),
      (v_feat,'released','closed','forward',false,150),(v_feat,NULL,'blocked','exception',true,160),
      (v_feat,'blocked','in_development','backward',true,170),(v_feat,NULL,'canceled','cancel',true,180),
      (v_feat,'closed','reopened','reopen',true,190),(v_feat,'reopened','in_development','forward',false,200);
    INSERT INTO ph_wf_transition_roles (transition_id, role_group, allow_assignee, allow_super_admin_bypass, bypass_requires_reason)
    SELECT t.id, x.rg, x.aa, true, true FROM (VALUES
      ('identified','requirements','business_analyst',false),('requirements','design','designer',false),
      ('design','ready_for_dev','team_lead',false),('ready_for_dev','in_development','developer',true),
      ('in_development','code_review','developer',true),('code_review','in_integration','developer',false),
      ('in_integration','ready_for_qa','qa_lead',false),('ready_for_qa','qa_testing','qa_tester',false),
      ('qa_testing','qa_passed','qa_lead',false),('qa_passed','uat_ready','product_owner',false),
      ('uat_ready','in_uat','business_user',false),('in_uat','uat_accepted','business_user',false),
      ('uat_accepted','ready_for_release','release_manager',false),('ready_for_release','released','release_manager',false),
      ('released','closed','product_owner',false),('__any__','blocked','team_lead',true),
      ('blocked','in_development','developer',true),('__any__','canceled','product_owner',false),
      ('closed','reopened','qa_lead',false),('reopened','in_development','developer',true)
    ) AS x(fk,tk,rg,aa)
    JOIN ph_wf_version_transitions t ON t.version_id=v_feat AND t.to_status_key=x.tk
     AND (t.from_status_key=NULLIF(x.fk,'__any__') OR (x.fk='__any__' AND t.from_status_key IS NULL));
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'acceptance_criteria_present','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_feat AND t.to_status_key='ready_for_dev'
    UNION ALL SELECT t.id,'assignee_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_feat AND t.from_status_key='ready_for_dev' AND t.to_status_key='in_development'
    UNION ALL SELECT t.id,'qa_signoff','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_feat AND t.to_status_key='qa_passed'
    UNION ALL SELECT t.id,'uat_signoff','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_feat AND t.to_status_key='uat_accepted'
    UNION ALL SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_feat AND t.to_status_key IN ('blocked','canceled','reopened');
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'feature',v_feat)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_feat,'feature','Backlog','identified','confident'),(v_feat,'feature','In Progress','in_development','confident'),
    (v_feat,'feature','Done','closed','confident'),(v_feat,'feature','In QA','qa_testing','confident'),
    (v_feat,'feature','In UAT','in_uat','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
