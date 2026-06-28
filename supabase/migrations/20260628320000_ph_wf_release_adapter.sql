-- Bridged Release adapter foundation (Option A). Additive + idempotent.
-- Adds rh_releases.workflow_status_key; existing rh_releases.status (free text)
-- PRESERVED, never widened (it is text, not an enum). releases + release_versions
-- untouched. Seeds Release v1 + remaps + scheme entry. Advisory. Staging only.
ALTER TABLE public.rh_releases ADD COLUMN IF NOT EXISTS workflow_status_key text;
COMMENT ON COLUMN public.rh_releases.workflow_status_key IS 'Canonical ph_wf_* status key (bridged). Free-text status kept for compatibility.';

DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Release' AND name='Release SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Release SDLC','Release','Canonical Release lifecycle (bridged rh_releases)', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='release' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'release',1,'published',now(),'Canonical Release workflow v1') RETURNING id INTO v_ver;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'draft','Draft','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_ver,'scope_planning','Scope Planning','in_progress','plan',20,'color.background.information',false,false,false,false,false),
      (v_ver,'scope_locked','Scope Locked','in_progress','plan',30,'color.background.information',false,false,false,false,true),
      (v_ver,'build_packaging','Build Packaging','in_progress','build',40,'color.background.information',false,false,false,false,false),
      (v_ver,'qa_signoff_pending','QA Sign-off Pending','in_progress','verify',50,'color.background.warning',false,false,false,false,false),
      (v_ver,'uat_signoff_pending','UAT Sign-off Pending','in_progress','verify',60,'color.background.warning',false,false,false,false,false),
      (v_ver,'golive_approval_pending','Go-Live Approval Pending','in_progress','approve',70,'color.background.warning',false,false,false,false,false),
      (v_ver,'scheduled','Scheduled','in_progress','deploy',80,'color.background.information',false,false,false,false,false),
      (v_ver,'deploying','Deploying','in_progress','deploy',90,'color.background.information',false,false,false,false,false),
      (v_ver,'deployed','Deployed','in_progress','deploy',100,'color.background.information',false,false,false,false,false),
      (v_ver,'hypercare','Hypercare','in_progress','verify',110,'color.background.information',false,false,false,false,false),
      (v_ver,'closed','Closed','done','closed',120,'color.background.success',false,true,false,true,false),
      (v_ver,'rolled_back','Rolled Back','done','terminal',130,'color.background.danger',false,true,true,true,true),
      (v_ver,'canceled','Canceled','done','terminal',140,'color.background.danger',false,true,false,false,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'draft','scope_planning','forward',false,10),
      (v_ver,'scope_planning','scope_locked','forward',true,20),
      (v_ver,'scope_locked','build_packaging','forward',false,30),
      (v_ver,'build_packaging','qa_signoff_pending','forward',false,40),
      (v_ver,'qa_signoff_pending','uat_signoff_pending','forward',false,50),
      (v_ver,'uat_signoff_pending','golive_approval_pending','forward',false,60),
      (v_ver,'golive_approval_pending','scheduled','forward',false,70),
      (v_ver,'scheduled','deploying','forward',false,80),
      (v_ver,'deploying','deployed','forward',false,90),
      (v_ver,'deployed','hypercare','forward',false,100),
      (v_ver,'hypercare','closed','forward',false,110),
      (v_ver,'deployed','rolled_back','exception',true,120),
      (v_ver,'deploying','rolled_back','exception',true,130),
      (v_ver,'rolled_back','scope_planning','reopen',true,140),
      (v_ver,NULL,'canceled','cancel',true,150);
    -- Guards prepared per approved set. Blocking until a real evidence source
    -- exists is handled by waiver_allowed + the runtime advisory default; the
    -- runtime only enforces guards that have a real evaluator, others log honestly.
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key IN ('scope_locked','rolled_back','canceled')
    UNION ALL SELECT t.id,'qa_signoff','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='qa_signoff_pending' AND t.to_status_key='uat_signoff_pending'
    UNION ALL SELECT t.id,'uat_signoff','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='uat_signoff_pending' AND t.to_status_key='golive_approval_pending'
    UNION ALL SELECT t.id,'release_readiness','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='golive_approval_pending' AND t.to_status_key='scheduled'
    UNION ALL SELECT t.id,'no_open_blocker_critical','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='golive_approval_pending' AND t.to_status_key='scheduled'
    UNION ALL SELECT t.id,'deployment_window','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='scheduled' AND t.to_status_key='deploying'
    UNION ALL SELECT t.id,'deployment_evidence','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='deploying' AND t.to_status_key='deployed'
    UNION ALL SELECT t.id,'smoke_evidence','{}'::jsonb,true,true FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.from_status_key='deployed' AND t.to_status_key='hypercare';
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'release',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  -- remaps from rh_releases.status free text (CONFIDENT only; ambiguous left UNMAPPED).
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'release','draft','draft','confident'),
    (v_ver,'release','scheduled','scheduled','confident'),
    (v_ver,'release','deploying','deploying','confident'),
    (v_ver,'release','deployed','deployed','confident'),
    (v_ver,'release','closed','closed','confident'),
    (v_ver,'release','canceled','canceled','confident'),
    (v_ver,'release','rolled_back','rolled_back','confident')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
