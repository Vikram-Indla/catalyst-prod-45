-- Epic canonical workflow v1 — reproducible seed (advisory). Mirrors Story slice.
-- Additive + idempotent. Adds 'epic' to the Default Canonical Scheme. No enforcement
-- row → Epic stays ADVISORY everywhere. Staging only. Production untouched.
DO $$
DECLARE
  v_template uuid;
  v_scheme   uuid;
  v_version  uuid;
BEGIN
  -- Epic template (create if absent; appears in classic Templates list — additive)
  SELECT id INTO v_template FROM ph_workflow_templates WHERE work_item_type='Epic' AND name='Epic SDLC';
  IF v_template IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Epic SDLC','Epic','Canonical Epic delivery lifecycle', false) RETURNING id INTO v_template;
  END IF;

  SELECT id INTO v_version FROM ph_wf_versions WHERE template_id=v_template AND entity_key='epic' AND version_no=1;
  IF v_version IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_template,'epic',1,'published',now(),'Canonical Epic workflow v1') RETURNING id INTO v_version;

    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_version,'backlog','Backlog','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_version,'discovery','Discovery','in_progress','shaping',20,'color.background.information',false,false,false,false,false),
      (v_version,'ready_for_breakdown','Ready for Breakdown','in_progress','shaping',30,'color.background.information',false,false,false,false,false),
      (v_version,'committed','Committed','in_progress','plan',40,'color.background.information',false,false,false,false,false),
      (v_version,'in_delivery','In Delivery','in_progress','delivery',50,'color.background.information',false,false,false,false,false),
      (v_version,'in_validation','In Validation','in_progress','verify',60,'color.background.information',false,false,false,false,false),
      (v_version,'ready_for_release','Ready for Release','in_progress','release',70,'color.background.information',false,false,false,false,false),
      (v_version,'released','Released','done','release',80,'color.background.success',false,false,false,false,false),
      (v_version,'closed','Closed','done','closed',90,'color.background.success',false,true,false,false,false),
      (v_version,'on_hold','On Hold','in_progress','exception',100,'color.background.warning',false,false,true,false,true),
      (v_version,'canceled','Canceled','done','terminal',110,'color.background.danger',false,true,false,false,true);

    INSERT INTO ph_wf_version_transitions
      (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_version,'backlog','discovery','forward',false,10),
      (v_version,'discovery','ready_for_breakdown','forward',false,20),
      (v_version,'ready_for_breakdown','committed','forward',false,30),
      (v_version,'committed','in_delivery','forward',false,40),
      (v_version,'in_delivery','in_validation','forward',false,50),
      (v_version,'in_validation','ready_for_release','forward',false,60),
      (v_version,'ready_for_release','released','forward',false,70),
      (v_version,'released','closed','forward',false,80),
      (v_version,NULL,'on_hold','exception',true,90),
      (v_version,'on_hold','in_delivery','backward',true,100),
      (v_version,NULL,'canceled','cancel',true,110);

    -- one guard: child completion before Ready for Release (advisory)
    INSERT INTO ph_wf_transition_guards(transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'child_completion','{}'::jsonb,true,true FROM ph_wf_version_transitions t
    WHERE t.version_id=v_version AND t.from_status_key='in_validation' AND t.to_status_key='ready_for_release';
  END IF;

  -- add epic entry to the default scheme
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id)
  VALUES (v_scheme,'epic',v_version)
  ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;

  -- legacy -> canonical remaps (confident)
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note)
  VALUES
    (v_version,'epic','Backlog','backlog','confident'),
    (v_version,'epic','To Do','backlog','confident'),
    (v_version,'epic','In Progress','in_delivery','confident'),
    (v_version,'epic','Selected for Development','committed','confident'),
    (v_version,'epic','Done','closed','confident'),
    (v_version,'epic','On Hold','on_hold','confident')
  ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
