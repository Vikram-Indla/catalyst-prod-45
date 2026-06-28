-- ============================================================================
-- Story canonical workflow v1 — reproducible seed (P3 Story vertical slice)
-- Feature: CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001
-- ----------------------------------------------------------------------------
-- ADDITIVE + IDEMPOTENT. Seeds the published Story workflow version, its 18
-- statuses, 21 transitions, the Default Canonical Scheme, the story scheme
-- entry, the BAU assignment, and the legacy->canonical status remaps.
-- Re-running is a no-op (guards on existence). No existing object touched.
-- Staging only (cyijbdeuehohvhnsywig). Production never touched.
-- ============================================================================
DO $$
DECLARE
  v_template uuid := '77a68098-c3cf-4b51-aaf6-f1c8323a5596'; -- existing "Story SDLC"
  v_project  uuid := '84f91caf-7511-470a-9a26-3e52e66258bf'; -- BAU
  v_version  uuid;
  v_scheme   uuid;
BEGIN
  SELECT id INTO v_version FROM ph_wf_versions
   WHERE template_id=v_template AND entity_key='story' AND version_no=1;

  IF v_version IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_template,'story',1,'published',now(),'Canonical Story workflow v1')
    RETURNING id INTO v_version;

    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_version,'backlog','Backlog','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_version,'refinement','Refinement','todo','shaping',20,'color.background.neutral',false,false,false,false,false),
      (v_version,'ready_for_dev','Ready for Development','todo','build',30,'color.background.neutral',false,false,false,false,false),
      (v_version,'in_development','In Development','in_progress','build',40,'color.background.information',false,false,false,false,false),
      (v_version,'code_review','Code Review','in_progress','build',50,'color.background.information',false,false,false,false,false),
      (v_version,'ready_for_qa','Ready for QA','in_progress','verify',60,'color.background.information',false,false,false,false,false),
      (v_version,'qa_testing','QA Testing','in_progress','verify',70,'color.background.information',false,false,false,false,false),
      (v_version,'qa_failed','QA Failed','in_progress','verify',80,'color.background.warning',false,false,true,false,true),
      (v_version,'qa_passed','QA Passed','in_progress','verify',90,'color.background.information',false,false,false,false,false),
      (v_version,'uat_ready','UAT Ready','in_progress','uat',100,'color.background.information',false,false,false,false,false),
      (v_version,'in_uat','In UAT','in_progress','uat',110,'color.background.information',false,false,false,false,false),
      (v_version,'uat_failed','UAT Failed','in_progress','uat',120,'color.background.warning',false,false,true,false,true),
      (v_version,'uat_accepted','UAT Accepted','in_progress','uat',130,'color.background.information',false,false,false,false,false),
      (v_version,'ready_for_release','Ready for Release','in_progress','release',140,'color.background.information',false,false,false,false,false),
      (v_version,'done','Done','done','closed',150,'color.background.success',false,true,false,true,false),
      (v_version,'blocked','Blocked','in_progress','exception',160,'color.background.warning',false,false,true,false,true),
      (v_version,'canceled','Canceled','done','terminal',170,'color.background.danger',false,true,false,false,true),
      (v_version,'reopened','Reopened','todo','reopen',180,'color.background.information',false,false,false,false,true);

    INSERT INTO ph_wf_version_transitions
      (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_version,'backlog','refinement','forward',false,10),
      (v_version,'refinement','ready_for_dev','forward',false,20),
      (v_version,'ready_for_dev','in_development','forward',false,30),
      (v_version,'in_development','code_review','forward',false,40),
      (v_version,'code_review','ready_for_qa','forward',false,50),
      (v_version,'ready_for_qa','qa_testing','forward',false,60),
      (v_version,'qa_testing','qa_passed','forward',false,70),
      (v_version,'qa_testing','qa_failed','exception',true,80),
      (v_version,'qa_failed','in_development','backward',true,90),
      (v_version,'qa_passed','uat_ready','forward',false,100),
      (v_version,'uat_ready','in_uat','forward',false,110),
      (v_version,'in_uat','uat_accepted','forward',false,120),
      (v_version,'in_uat','uat_failed','exception',true,130),
      (v_version,'uat_failed','in_development','backward',true,140),
      (v_version,'uat_accepted','ready_for_release','forward',false,150),
      (v_version,'ready_for_release','done','forward',false,160),
      (v_version,NULL,'blocked','exception',true,170),
      (v_version,'blocked','in_development','backward',true,180),
      (v_version,NULL,'canceled','cancel',true,190),
      (v_version,'done','reopened','reopen',true,200),
      (v_version,'reopened','in_development','forward',false,210);
  END IF;

  -- scheme + entry + assignment (idempotent)
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE name='Default Canonical Scheme';
  IF v_scheme IS NULL THEN
    INSERT INTO ph_wf_schemes(name,description,is_default)
    VALUES ('Default Canonical Scheme','Default scheme',true) RETURNING id INTO v_scheme;
  END IF;

  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id)
  VALUES (v_scheme,'story',v_version)
  ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;

  INSERT INTO ph_wf_scheme_assignments(project_id,scheme_id)
  VALUES (v_project,v_scheme)
  ON CONFLICT (project_id) DO UPDATE SET scheme_id=EXCLUDED.scheme_id, assigned_at=now();

  -- Legacy -> canonical status remaps (CONFIDENT mappings only).
  -- Unmapped legacy values are intentionally absent and surface in the
  -- /admin/workflows/versions migration preview as "unmapped — needs review".
  -- old_status_key holds the exact legacy ph_issues.status text.
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note)
  VALUES
    (v_version,'story','Backlog','backlog','confident'),
    (v_version,'story','Prioritized Backlog','backlog','confident'),
    (v_version,'story','To Do','backlog','confident'),
    (v_version,'story','Ready for development','ready_for_dev','confident'),
    (v_version,'story','In Development','in_development','confident'),
    (v_version,'story','In QA','qa_testing','confident'),
    (v_version,'story','Internal QA','qa_testing','confident'),
    (v_version,'story','In UAT','in_uat','confident'),
    (v_version,'story','Done','done','confident'),
    (v_version,'story','On Hold','blocked','confident')
  ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
