-- Business Request adapter foundation (A-lite). Additive + idempotent.
-- business_requests.process_step (free text) IS the canonical store — no new
-- column, no enum, nothing widened. Seeds BR v1 + remaps + scheme entry.
-- Advisory. Staging only.
DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Business Request' AND name='Business Request SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Business Request SDLC','Business Request','Canonical Business Request lifecycle (A-lite, process_step)', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='business_request' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'business_request',1,'published',now(),'Canonical Business Request workflow v1') RETURNING id INTO v_ver;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'funnel','Funnel','todo','intake',10,'color.background.neutral',true,false,false,false,false),
      (v_ver,'demand_intake','Demand Intake','todo','intake',20,'color.background.neutral',false,false,false,false,false),
      (v_ver,'analysis_design','Analysis & Design','in_progress','define',30,'color.background.information',false,false,false,false,false),
      (v_ver,'product_validation','Product Validation','in_progress','define',40,'color.background.information',false,false,false,false,false),
      (v_ver,'pending_approval','Pending Approval','in_progress','approve',50,'color.background.warning',false,false,false,false,false),
      (v_ver,'ready_for_implementation','Ready for Implementation','in_progress','approve',60,'color.background.information',false,false,false,false,false),
      (v_ver,'implementation','Implementation','in_progress','build',70,'color.background.information',false,false,false,false,false),
      (v_ver,'review_qa','Review & QA','in_progress','verify',80,'color.background.information',false,false,false,false,false),
      (v_ver,'uat','UAT','in_progress','verify',90,'color.background.information',false,false,false,false,false),
      (v_ver,'ready_for_production','Ready for Production','in_progress','release',100,'color.background.information',false,false,false,false,false),
      (v_ver,'done','Done','done','closed',110,'color.background.success',false,true,false,true,false),
      (v_ver,'on_hold','On Hold','in_progress','exception',120,'color.background.warning',false,false,true,true,true),
      (v_ver,'canceled','Canceled','done','terminal',130,'color.background.danger',false,true,false,false,true),
      (v_ver,'rejected','Rejected','done','terminal',140,'color.background.danger',false,true,false,false,true),
      (v_ver,'reopened','Reopened','todo','reopen',150,'color.background.information',false,false,false,true,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'funnel','demand_intake','forward',false,10),
      (v_ver,'demand_intake','analysis_design','forward',false,20),
      (v_ver,'analysis_design','product_validation','forward',false,30),
      (v_ver,'product_validation','pending_approval','forward',false,40),
      (v_ver,'pending_approval','ready_for_implementation','forward',false,50),
      (v_ver,'ready_for_implementation','implementation','forward',false,60),
      (v_ver,'implementation','review_qa','forward',false,70),
      (v_ver,'review_qa','uat','forward',false,80),
      (v_ver,'uat','ready_for_production','forward',false,90),
      (v_ver,'ready_for_production','done','forward',false,100),
      (v_ver,NULL,'on_hold','exception',true,110),
      (v_ver,'on_hold','analysis_design','forward',true,120),
      (v_ver,'pending_approval','rejected','exception',true,130),
      (v_ver,NULL,'canceled','cancel',true,140),
      (v_ver,'done','reopened','reopen',true,150),
      (v_ver,'reopened','analysis_design','forward',false,160);
    -- Advisory governance guards (no real evaluator yet → logged, never faked).
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key IN ('on_hold','rejected','canceled','reopened')
    UNION ALL SELECT t.id,'brd_attached','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='product_validation'
    UNION ALL SELECT t.id,'approval','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='pending_approval' AND t.to_status_key='ready_for_implementation'
    UNION ALL SELECT t.id,'release_readiness','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='ready_for_production';
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'business_request',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  -- remaps from live process_step text (CONFIDENT only; 'Demand Validation'
  -- left UNMAPPED on purpose — ambiguous between demand_intake & product_validation).
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'business_request','Demand Intake','demand_intake','confident'),
    (v_ver,'business_request','In Requirements','analysis_design','confident'),
    (v_ver,'business_request','In Development','implementation','confident'),
    (v_ver,'business_request','Done','done','confident'),
    (v_ver,'business_request','Rejected','rejected','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
