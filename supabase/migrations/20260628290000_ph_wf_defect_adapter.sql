-- Bridged Defect adapter foundation (Option A). Additive + idempotent.
-- Adds tm_defects.workflow_status_key (text) — enum `status` PRESERVED, never
-- widened. Seeds Defect v1 workflow + remaps + scheme entry. Advisory (no
-- enforcement row). Staging only; production untouched.
ALTER TABLE public.tm_defects ADD COLUMN IF NOT EXISTS workflow_status_key text;
COMMENT ON COLUMN public.tm_defects.workflow_status_key IS 'Canonical ph_wf_* status key (bridged). Enum status kept for compatibility.';

DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Defect' AND name='Defect SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Defect SDLC','Defect','Canonical Defect lifecycle (bridged tm_defects)', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='defect' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'defect',1,'published',now(),'Canonical Defect workflow v1') RETURNING id INTO v_ver;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'new','New','todo','triage',10,'color.background.neutral',true,false,false,false,false),
      (v_ver,'triage','Triage','todo','triage',20,'color.background.neutral',false,false,false,false,false),
      (v_ver,'rejected','Rejected','done','terminal',30,'color.background.danger',false,true,false,false,true),
      (v_ver,'duplicate','Duplicate','done','terminal',40,'color.background.danger',false,true,false,false,false),
      (v_ver,'deferred','Deferred','todo','exception',50,'color.background.warning',false,false,true,false,true),
      (v_ver,'accepted','Accepted','in_progress','fix',60,'color.background.information',false,false,false,false,false),
      (v_ver,'assigned_for_fix','Assigned for Fix','in_progress','fix',70,'color.background.information',false,false,false,false,false),
      (v_ver,'in_fix','In Fix','in_progress','fix',80,'color.background.information',false,false,false,false,false),
      (v_ver,'ready_for_retest','Ready for Retest','in_progress','verify',90,'color.background.information',false,false,false,false,false),
      (v_ver,'retest','Retest','in_progress','verify',100,'color.background.information',false,false,false,false,false),
      (v_ver,'retest_failed','Retest Failed','in_progress','verify',110,'color.background.warning',false,false,true,false,true),
      (v_ver,'verified','Verified','in_progress','verify',120,'color.background.information',false,false,false,false,false),
      (v_ver,'uat_ready','UAT Ready','in_progress','uat',130,'color.background.information',false,false,false,false,false),
      (v_ver,'uat_failed','UAT Failed','in_progress','uat',140,'color.background.warning',false,false,true,false,true),
      (v_ver,'uat_passed','UAT Passed','in_progress','uat',150,'color.background.information',false,false,false,false,false),
      (v_ver,'ready_for_release','Ready for Release','in_progress','release',160,'color.background.information',false,false,false,false,false),
      (v_ver,'closed','Closed','done','closed',170,'color.background.success',false,true,false,true,false),
      (v_ver,'reopened','Reopened','todo','reopen',180,'color.background.information',false,false,false,true,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'new','triage','forward',false,10),(v_ver,'triage','accepted','forward',false,20),
      (v_ver,'triage','rejected','reject',true,30),(v_ver,'triage','duplicate','forward',false,40),
      (v_ver,'triage','deferred','defer',true,50),(v_ver,'accepted','assigned_for_fix','forward',false,60),
      (v_ver,'assigned_for_fix','in_fix','forward',false,70),(v_ver,'in_fix','ready_for_retest','forward',false,80),
      (v_ver,'ready_for_retest','retest','forward',false,90),(v_ver,'retest','verified','forward',false,100),
      (v_ver,'retest','retest_failed','exception',true,110),(v_ver,'retest_failed','assigned_for_fix','backward',true,120),
      (v_ver,'verified','uat_ready','forward',false,130),(v_ver,'uat_ready','uat_passed','forward',false,140),
      (v_ver,'uat_ready','uat_failed','exception',true,150),(v_ver,'uat_failed','assigned_for_fix','backward',true,160),
      (v_ver,'uat_passed','ready_for_release','forward',false,170),(v_ver,'ready_for_release','closed','forward',false,180),
      (v_ver,'closed','reopened','reopen',true,190),(v_ver,'reopened','triage','forward',false,200);
    -- guards: reason on reject/defer/fails/reopen
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t
    WHERE t.version_id=v_ver AND t.to_status_key IN ('rejected','deferred','retest_failed','uat_failed','reopened');
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'defect',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  -- remaps from tm_defect_status enum (confident)
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'defect','open','new','confident'),(v_ver,'defect','in_progress','in_fix','confident'),
    (v_ver,'defect','resolved','verified','confident'),(v_ver,'defect','closed','closed','confident'),
    (v_ver,'defect','reopened','reopened','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
