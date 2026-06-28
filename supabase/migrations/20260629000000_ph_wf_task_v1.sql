-- Task v1: additive workflow_status_key on task_statuses + Task canonical seed.
-- A_projection strategy: task_statuses.workflow_status_key maps each status row
-- to a canonical key. tasks.status_id (FK) preserved. No enum widened.
-- Advisory. Staging only.

ALTER TABLE public.task_statuses ADD COLUMN IF NOT EXISTS workflow_status_key text;
COMMENT ON COLUMN public.task_statuses.workflow_status_key IS 'Canonical ph_wf_* status key projected from task_statuses row (A_projection). NULL = unmapped.';

-- Map existing rows by slug heuristic (best-effort; NULL stays for unmapped).
UPDATE public.task_statuses SET workflow_status_key = CASE
  WHEN slug ILIKE '%new%'                                                             THEN 'new'
  WHEN slug = 'backlog' OR slug ILIKE '%todo%' OR slug ILIKE '%to-do%'               THEN 'new'
  WHEN slug = 'planned'                                                               THEN 'new'
  WHEN slug ILIKE '%assign%'                                                          THEN 'assigned'
  WHEN slug = 'in-progress' OR slug = 'in_progress' OR slug ILIKE '%doing%'
    OR slug ILIKE '%active%'                                                          THEN 'in_progress'
  WHEN slug ILIKE '%wait%'                                                            THEN 'waiting'
  WHEN slug ILIKE '%block%'                                                           THEN 'blocked'
  WHEN slug ILIKE '%review%' OR slug ILIKE '%test%' OR slug ILIKE '%qa%'             THEN 'in_review'
  WHEN slug = 'done' OR slug ILIKE '%complet%' OR slug ILIKE '%closed%'              THEN 'done'
  WHEN slug ILIKE '%cancel%' OR slug ILIKE '%dismiss%' OR slug ILIKE '%archiv%'      THEN 'canceled'
  ELSE NULL
END
WHERE workflow_status_key IS NULL;

DO $$
DECLARE v_tmpl uuid; v_ver uuid; v_scheme uuid;
BEGIN
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true;
  SELECT id INTO v_tmpl FROM ph_workflow_templates WHERE work_item_type='Task' AND name='Task SDLC';
  IF v_tmpl IS NULL THEN
    INSERT INTO ph_workflow_templates(name, work_item_type, description, is_default)
    VALUES ('Task SDLC','Task','Canonical Task lifecycle (A_projection via task_statuses)', false)
    RETURNING id INTO v_tmpl;
  END IF;
  SELECT id INTO v_ver FROM ph_wf_versions WHERE template_id=v_tmpl AND entity_key='task' AND version_no=1;
  IF v_ver IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_tmpl,'task',1,'published',now(),'Canonical Task workflow v1')
    RETURNING id INTO v_ver;

    INSERT INTO ph_wf_version_statuses
      (version_id,status_key,display_label,category,lifecycle_group,sort_order,color_token,is_initial,is_terminal,is_exception,supports_reopen,requires_reason)
    VALUES
      (v_ver,'new',        'New',         'todo',        'open',     10,'color.background.neutral',    true, false,false,false,false),
      (v_ver,'assigned',   'Assigned',    'todo',        'open',     20,'color.background.neutral',    false,false,false,false,false),
      (v_ver,'in_progress','In Progress', 'in_progress', 'active',   30,'color.background.information',false,false,false,false,false),
      (v_ver,'waiting',    'Waiting',     'in_progress', 'active',   40,'color.background.warning',    false,false,true, false,false),
      (v_ver,'blocked',    'Blocked',     'in_progress', 'active',   50,'color.background.warning',    false,false,true, false,false),
      (v_ver,'in_review',  'In Review',   'in_progress', 'verify',   60,'color.background.information',false,false,false,false,false),
      (v_ver,'done',       'Done',        'done',        'closed',   70,'color.background.success',    false,true, false,true, false),
      (v_ver,'canceled',   'Canceled',    'done',        'terminal', 80,'color.background.danger',     false,true, false,false,true);

    INSERT INTO ph_wf_version_transitions
      (version_id,from_status_key,to_status_key,transition_type,requires_reason,sort_order)
    VALUES
      (v_ver,'new',        'assigned',   'forward',  false,10),
      (v_ver,'new',        'in_progress','forward',  false,20),
      (v_ver,'new',        'canceled',   'cancel',   true, 30),
      (v_ver,'assigned',   'in_progress','forward',  false,40),
      (v_ver,'assigned',   'canceled',   'cancel',   true, 50),
      (v_ver,'in_progress','waiting',    'exception',false,60),
      (v_ver,'in_progress','blocked',    'exception',false,70),
      (v_ver,'in_progress','in_review',  'forward',  false,80),
      (v_ver,'in_progress','done',       'forward',  false,90),
      (v_ver,'in_progress','canceled',   'cancel',   true, 100),
      (v_ver,'waiting',    'in_progress','forward',  false,110),
      (v_ver,'waiting',    'canceled',   'cancel',   true, 120),
      (v_ver,'blocked',    'in_progress','forward',  false,130),
      (v_ver,'blocked',    'canceled',   'cancel',   true, 140),
      (v_ver,'in_review',  'in_progress','backward', false,150),
      (v_ver,'in_review',  'done',       'forward',  false,160),
      (v_ver,'in_review',  'canceled',   'cancel',   true, 170),
      (v_ver,'done',       'new',        'reopen',   true, 180),
      (v_ver,'canceled',   'new',        'reopen',   true, 190);

    -- Guards via transition join
    INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
    SELECT t.id,'reason_required','{}'::jsonb,false,false
    FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.requires_reason=true
    UNION ALL
    SELECT t.id,'assignee_required','{}'::jsonb,false,false
    FROM ph_wf_version_transitions t WHERE t.version_id=v_ver AND t.to_status_key='done';
  END IF;

  INSERT INTO ph_wf_scheme_entries(scheme_id,entity_key,version_id) VALUES (v_scheme,'task',v_ver)
    ON CONFLICT (scheme_id,entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;

  -- Remaps: slug values → canonical key (additive, safe)
  INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
    (v_ver,'task','new',        'new',        'identity'),
    (v_ver,'task','backlog',    'new',        'backlog→new'),
    (v_ver,'task','todo',       'new',        'todo→new'),
    (v_ver,'task','planned',    'new',        'planned→new'),
    (v_ver,'task','assigned',   'assigned',   'identity'),
    (v_ver,'task','in-progress','in_progress','hyphen slug'),
    (v_ver,'task','in_progress','in_progress','identity'),
    (v_ver,'task','doing',      'in_progress','doing→in_progress'),
    (v_ver,'task','active',     'in_progress','active→in_progress'),
    (v_ver,'task','waiting',    'waiting',    'identity'),
    (v_ver,'task','blocked',    'blocked',    'identity'),
    (v_ver,'task','review',     'in_review',  'review→in_review'),
    (v_ver,'task','in-review',  'in_review',  'hyphen slug'),
    (v_ver,'task','done',       'done',       'identity'),
    (v_ver,'task','completed',  'done',       'completed→done'),
    (v_ver,'task','closed',     'done',       'closed→done'),
    (v_ver,'task','canceled',   'canceled',   'identity'),
    (v_ver,'task','cancelled',  'canceled',   'UK spelling'),
    (v_ver,'task','dismissed',  'canceled',   'dismissed→canceled')
    ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
END $$;
