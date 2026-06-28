-- Product Milestone adapter foundation (A-lite). Additive + idempotent.
-- product_milestones.status (free text/varchar) IS the canonical store — no new
-- column, no enum, nothing widened. Seeds PM v1 + remaps + scheme entry.
-- Advisory. product_milestones is empty on staging → identity remaps seeded for
-- the canonical vocabulary so future rows resolve. Staging only.
DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Product Milestone' AND name='Product Milestone SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Product Milestone SDLC','Product Milestone','Canonical Product Milestone lifecycle (A-lite, status)', false) RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='product_milestone' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'product_milestone',1,'published',now(),'Canonical Product Milestone workflow v1') RETURNING id INTO v_ver;
    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'draft','Draft','todo','plan',10,'color.background.neutral',true,false,false,false,false),
      (v_ver,'planned','Planned','todo','plan',20,'color.background.neutral',false,false,false,false,false),
      (v_ver,'committed','Committed','in_progress','commit',30,'color.background.information',false,false,false,false,true),
      (v_ver,'in_progress','In Progress','in_progress','execute',40,'color.background.information',false,false,false,false,false),
      (v_ver,'at_risk','At Risk','in_progress','execute',50,'color.background.warning',false,false,true,false,true),
      (v_ver,'blocked','Blocked','in_progress','execute',60,'color.background.danger',false,false,true,false,true),
      (v_ver,'ready_for_acceptance','Ready for Acceptance','in_progress','verify',70,'color.background.information',false,false,false,false,false),
      (v_ver,'achieved','Achieved','done','closed',80,'color.background.success',false,true,false,false,false),
      (v_ver,'missed','Missed','done','terminal',90,'color.background.danger',false,true,true,false,true),
      (v_ver,'deferred','Deferred','done','terminal',100,'color.background.warning',false,true,false,true,true),
      (v_ver,'canceled','Canceled','done','terminal',110,'color.background.danger',false,true,false,false,true);
    INSERT INTO ph_wf_version_transitions (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'draft','planned','forward',false,10),
      (v_ver,'planned','committed','forward',true,20),
      (v_ver,'committed','in_progress','forward',false,30),
      (v_ver,'in_progress','at_risk','exception',true,40),
      (v_ver,'at_risk','in_progress','forward',false,50),
      (v_ver,'in_progress','blocked','exception',true,60),
      (v_ver,'blocked','in_progress','forward',false,70),
      (v_ver,'in_progress','ready_for_acceptance','forward',false,80),
      (v_ver,'ready_for_acceptance','achieved','forward',false,90),
      (v_ver,NULL,'missed','exception',true,100),
      (v_ver,NULL,'deferred','forward',true,110),
      (v_ver,NULL,'canceled','cancel',true,120),
      (v_ver,'deferred','planned','reopen',true,130);
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,true,false FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key IN ('committed','at_risk','blocked','missed','deferred','canceled');
  END IF;
  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'product_milestone',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;
  -- Identity remaps for the canonical vocabulary (table empty → no legacy values).
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'product_milestone','draft','draft','identity'),
    (v_ver,'product_milestone','planned','planned','identity'),
    (v_ver,'product_milestone','committed','committed','identity'),
    (v_ver,'product_milestone','in_progress','in_progress','identity'),
    (v_ver,'product_milestone','at_risk','at_risk','identity'),
    (v_ver,'product_milestone','blocked','blocked','identity'),
    (v_ver,'product_milestone','achieved','achieved','identity'),
    (v_ver,'product_milestone','canceled','canceled','identity')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
