-- Sprint v1: A-lite (ph_jira_sprints.status IS the canonical store, free text).
-- No new columns. No enum widening. Advisory. Staging only.

DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Sprint' AND name='Sprint SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Sprint SDLC','Sprint','Canonical Sprint lifecycle (A-lite, ph_jira_sprints.status)', false)
    RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='sprint' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'sprint',1,'published',now(),'Canonical Sprint workflow v1')
    RETURNING id INTO v_ver;

    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'draft',               'Draft',               'todo',        'open',    10,'color.background.neutral',    true, false,false,false,false),
      (v_ver,'planning',            'Planning',            'todo',        'open',    20,'color.background.neutral',    false,false,false,false,false),
      (v_ver,'ready_to_start',      'Ready to Start',      'todo',        'open',    30,'color.background.information',false,false,false,false,false),
      (v_ver,'active',              'Active',              'in_progress', 'active',  40,'color.background.information',false,false,false,false,false),
      (v_ver,'scope_change_review', 'Scope Change Review', 'in_progress', 'active',  50,'color.background.warning',    false,false,true, false,false),
      (v_ver,'closing',             'Closing',             'in_progress', 'close',   60,'color.background.information',false,false,false,false,false),
      (v_ver,'completed',           'Completed',           'done',        'closed',  70,'color.background.success',    false,true, false,true, false),
      (v_ver,'canceled',            'Canceled',            'done',        'terminal',80,'color.background.danger',     false,true, false,false,true);

    INSERT INTO ph_wf_version_transitions
      (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'draft',               'planning',            'forward',  false,10),
      (v_ver,'draft',               'canceled',            'cancel',   true, 20),
      (v_ver,'planning',            'ready_to_start',      'forward',  false,30),
      (v_ver,'planning',            'canceled',            'cancel',   true, 40),
      (v_ver,'ready_to_start',      'active',              'forward',  false,50),
      (v_ver,'ready_to_start',      'planning',            'backward', false,60),
      (v_ver,'ready_to_start',      'canceled',            'cancel',   true, 70),
      (v_ver,'active',              'scope_change_review', 'exception',false,80),
      (v_ver,'active',              'closing',             'forward',  false,90),
      (v_ver,'active',              'canceled',            'cancel',   true, 100),
      (v_ver,'scope_change_review', 'active',              'forward',  false,110),
      (v_ver,'scope_change_review', 'canceled',            'cancel',   true, 120),
      (v_ver,'closing',             'completed',           'forward',  false,130),
      (v_ver,'closing',             'active',              'reopen',   true, 140),
      (v_ver,'completed',           'active',              'reopen',   true, 150),
      (v_ver,'canceled',            'planning',            'reopen',   true, 160);

    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,false,false
    FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.requires_reason=true
    UNION ALL
    SELECT t.id,'no_open_blocker_critical','{}'::jsonb,false,true
    FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='completed';
  END IF;

  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'sprint',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;

  -- Remaps: current ph_jira_sprints.status text values → canonical key
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'sprint','planning',  'planning',   'identity'),
    (v_ver,'sprint','active',    'active',     'identity'),
    (v_ver,'sprint','closed',    'completed',  'closed→completed'),
    (v_ver,'sprint','released',  'completed',  'released→completed'),
    (v_ver,'sprint','archived',  'canceled',   'archived→canceled'),
    (v_ver,'sprint','draft',     'draft',      'identity'),
    (v_ver,'sprint','completed', 'completed',  'identity'),
    (v_ver,'sprint','canceled',  'canceled',   'identity')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
