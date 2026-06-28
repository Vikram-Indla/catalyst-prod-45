-- Bridged Incident adapter foundation (Option A). Additive + idempotent.
-- Adds incidents.workflow_status_key; enum incident_status PRESERVED, never
-- widened. Seeds Incident v1 + remaps + scheme entry. Advisory. Staging only.
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS workflow_status_key text;
COMMENT ON COLUMN public.incidents.workflow_status_key IS 'Canonical ph_wf_* status key (bridged). Enum status kept for compatibility.';

DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Production Incident' AND name='Incident SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Incident SDLC','Production Incident','Canonical Incident lifecycle (bridged incidents)', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='incident' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'incident',1,'published',now(),'Canonical Incident workflow v1') RETURNING id INTO v_ver;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'reported','Reported','todo','triage',10,'color.background.neutral',true,false,false,false,false),
      (v_ver,'acknowledged','Acknowledged','in_progress','triage',20,'color.background.information',false,false,false,false,false),
      (v_ver,'triage','Triage','in_progress','triage',30,'color.background.information',false,false,false,false,false),
      (v_ver,'major_declared','Major Incident Declared','in_progress','major',40,'color.background.warning',false,false,true,false,true),
      (v_ver,'workaround','Workaround Identified','in_progress','resolve',50,'color.background.information',false,false,false,false,false),
      (v_ver,'in_resolution','In Resolution','in_progress','resolve',60,'color.background.information',false,false,false,false,false),
      (v_ver,'fix_ready','Fix Ready','in_progress','resolve',70,'color.background.information',false,false,false,false,false),
      (v_ver,'deploying_fix','Deploying Fix','in_progress','deploy',80,'color.background.information',false,false,false,false,false),
      (v_ver,'monitoring','Monitoring','in_progress','verify',90,'color.background.information',false,false,false,false,false),
      (v_ver,'resolved','Resolved','in_progress','verify',100,'color.background.information',false,false,false,false,false),
      (v_ver,'rca_pending','RCA Pending','in_progress','closure',110,'color.background.warning',false,false,true,false,true),
      (v_ver,'closed','Closed','done','closed',120,'color.background.success',false,true,false,true,false),
      (v_ver,'duplicate','Duplicate','done','terminal',130,'color.background.danger',false,true,false,false,true),
      (v_ver,'canceled','Canceled','done','terminal',140,'color.background.danger',false,true,false,false,true),
      (v_ver,'reopened','Reopened','todo','reopen',150,'color.background.information',false,false,false,true,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'reported','acknowledged','forward',false,10),(v_ver,'acknowledged','triage','forward',false,20),
      (v_ver,'triage','in_resolution','forward',false,30),(v_ver,'triage','major_declared','exception',true,40),
      (v_ver,'major_declared','in_resolution','forward',false,50),(v_ver,'in_resolution','workaround','forward',false,60),
      (v_ver,'workaround','fix_ready','forward',false,70),(v_ver,'in_resolution','fix_ready','forward',false,80),
      (v_ver,'fix_ready','deploying_fix','forward',false,90),(v_ver,'deploying_fix','monitoring','forward',false,100),
      (v_ver,'monitoring','resolved','forward',false,110),(v_ver,'resolved','rca_pending','forward',true,120),
      (v_ver,'rca_pending','closed','forward',false,130),(v_ver,'resolved','closed','forward',false,140),
      (v_ver,'triage','duplicate','forward',false,150),(v_ver,NULL,'canceled','cancel',true,160),
      (v_ver,'closed','reopened','reopen',true,170),(v_ver,'reopened','triage','forward',false,180);
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key IN ('major_declared','rca_pending','duplicate','canceled','reopened')
    UNION ALL SELECT t.id,'rca','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='rca_pending' AND t.to_status_key='closed'
    UNION ALL SELECT t.id,'deployment_evidence','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='monitoring'
    UNION ALL SELECT t.id,'smoke_evidence','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='monitoring' AND t.to_status_key='resolved'
    UNION ALL SELECT t.id,'no_open_blocker_critical','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='closed';
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'incident',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  -- remaps from incident_status enum (CONFIDENT only; to_committee/converted left UNMAPPED on purpose)
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'incident','open','reported','confident'),(v_ver,'incident','triage','triage','confident'),
    (v_ver,'incident','in_progress','in_resolution','confident'),(v_ver,'incident','resolved','resolved','confident'),
    (v_ver,'incident','closed','closed','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
