-- Seed canonical Business Request (13 statuses) and BRD Task (10 statuses)
-- workflow data for BAU project. Idempotent: uses WHERE NOT EXISTS guards
-- to skip statuses that already exist (case-insensitive).
DO $$
DECLARE
  v_proj UUID := '84f91caf-7511-470a-9a26-3e52e66258bf';
  s_new UUID; s_intake UUID; s_dval UUID; s_pappr UUID; s_pbl UUID;
  s_analysis UUID; s_impl UUID; s_rqa UUID; s_puat UUID; s_rprod UUID;
  s_onhold UUID; s_done UUID; s_canceled UUID;
  s_brd_bl UUID; s_figma UUID; s_brd_prep UUID; s_brd_rev UUID;
  s_brd_so UUID; s_rimpl UUID; s_blocked UUID;
BEGIN

  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'New','todo','#DDDEE1',1000,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='new' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Demand Intake','todo','#DDDEE1',1001,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='demand intake' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Demand Validation','todo','#DDDEE1',1002,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='demand validation' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Pending Approval','todo','#DDDEE1',1003,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='pending approval' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Prioritized Backlog','todo','#DDDEE1',1004,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='prioritized backlog' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Analysis & Design','in_progress','#8FB8F6',1005,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='analysis & design' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Review & QA','in_progress','#8FB8F6',1006,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='review & qa' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Pending UAT/Beta','in_progress','#8FB8F6',1007,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='pending uat/beta' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Ready for Production','done','#94C748',1008,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='ready for production' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'On Hold','todo','#DDDEE1',1009,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='on hold' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Canceled','done','#94C748',1010,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='canceled' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'BRD Backlog','todo','#DDDEE1',1011,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd backlog' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Figma Design','todo','#DDDEE1',1012,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='figma design' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'BRD Preparation','in_progress','#8FB8F6',1013,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd preparation' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'BRD Under Review','todo','#DDDEE1',1014,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd under review' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'BRD Sign Off','in_progress','#8FB8F6',1015,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd sign off' AND archived_at IS NULL);
  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Ready for Implementation','in_progress','#8FB8F6',1016,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='ready for implementation' AND archived_at IS NULL);

  SELECT id INTO s_new      FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='new' AND archived_at IS NULL;
  SELECT id INTO s_intake   FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='demand intake' AND archived_at IS NULL;
  SELECT id INTO s_dval     FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='demand validation' AND archived_at IS NULL;
  SELECT id INTO s_pappr    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='pending approval' AND archived_at IS NULL;
  SELECT id INTO s_pbl      FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='prioritized backlog' AND archived_at IS NULL;
  SELECT id INTO s_analysis FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='analysis & design' AND archived_at IS NULL;
  SELECT id INTO s_impl     FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='implementation' AND archived_at IS NULL;
  SELECT id INTO s_rqa      FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='review & qa' AND archived_at IS NULL;
  SELECT id INTO s_puat     FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='pending uat/beta' AND archived_at IS NULL;
  SELECT id INTO s_rprod    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='ready for production' AND archived_at IS NULL;
  SELECT id INTO s_onhold   FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='on hold' AND archived_at IS NULL;
  SELECT id INTO s_done     FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='done' AND archived_at IS NULL;
  SELECT id INTO s_canceled FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='canceled' AND archived_at IS NULL;
  SELECT id INTO s_brd_bl   FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd backlog' AND archived_at IS NULL;
  SELECT id INTO s_figma    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='figma design' AND archived_at IS NULL;
  SELECT id INTO s_brd_prep FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd preparation' AND archived_at IS NULL;
  SELECT id INTO s_brd_rev  FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd under review' AND archived_at IS NULL;
  SELECT id INTO s_brd_so   FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='brd sign off' AND archived_at IS NULL;
  SELECT id INTO s_rimpl    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='ready for implementation' AND archived_at IS NULL;
  SELECT id INTO s_blocked  FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='blocked' AND archived_at IS NULL;

  DELETE FROM ph_workflow_type_statuses WHERE project_id=v_proj AND work_item_type='Business Request';
  INSERT INTO ph_workflow_type_statuses (project_id,work_item_type,status_id,position,is_initial) VALUES
    (v_proj,'Business Request',s_new,0,true),(v_proj,'Business Request',s_intake,1,false),
    (v_proj,'Business Request',s_dval,2,false),(v_proj,'Business Request',s_pappr,3,false),
    (v_proj,'Business Request',s_pbl,4,false),(v_proj,'Business Request',s_analysis,5,false),
    (v_proj,'Business Request',s_impl,6,false),(v_proj,'Business Request',s_rqa,7,false),
    (v_proj,'Business Request',s_puat,8,false),(v_proj,'Business Request',s_rprod,9,false),
    (v_proj,'Business Request',s_onhold,10,false),(v_proj,'Business Request',s_done,11,false),
    (v_proj,'Business Request',s_canceled,12,false);

  DELETE FROM ph_workflow_transitions WHERE project_id=v_proj AND work_item_type='Business Request';
  INSERT INTO ph_workflow_transitions (project_id,work_item_type,from_status_id,to_status_id) VALUES
    (v_proj,'Business Request',s_new,s_intake),
    (v_proj,'Business Request',s_intake,s_dval),(v_proj,'Business Request',s_intake,s_analysis),
    (v_proj,'Business Request',s_dval,s_pappr),(v_proj,'Business Request',s_dval,s_pbl),
    (v_proj,'Business Request',s_pappr,s_pbl),(v_proj,'Business Request',s_pappr,s_analysis),
    (v_proj,'Business Request',s_pbl,s_analysis),(v_proj,'Business Request',s_analysis,s_impl),
    (v_proj,'Business Request',s_impl,s_dval),(v_proj,'Business Request',s_impl,s_pbl),
    (v_proj,'Business Request',s_impl,s_rqa),(v_proj,'Business Request',s_rqa,s_impl),
    (v_proj,'Business Request',s_rqa,s_puat),(v_proj,'Business Request',s_puat,s_rqa),
    (v_proj,'Business Request',s_puat,s_rprod),(v_proj,'Business Request',s_rprod,s_done),
    (v_proj,'Business Request',NULL,s_onhold),(v_proj,'Business Request',NULL,s_done),
    (v_proj,'Business Request',NULL,s_canceled);

  DELETE FROM ph_workflow_type_statuses WHERE project_id=v_proj AND work_item_type='BRD Task';
  INSERT INTO ph_workflow_type_statuses (project_id,work_item_type,status_id,position,is_initial) VALUES
    (v_proj,'BRD Task',s_brd_bl,0,true),(v_proj,'BRD Task',s_figma,1,false),
    (v_proj,'BRD Task',s_brd_prep,2,false),(v_proj,'BRD Task',s_brd_rev,3,false),
    (v_proj,'BRD Task',s_dval,4,false),(v_proj,'BRD Task',s_brd_so,5,false),
    (v_proj,'BRD Task',s_rimpl,6,false),(v_proj,'BRD Task',s_blocked,7,false),
    (v_proj,'BRD Task',s_canceled,8,false),(v_proj,'BRD Task',s_done,9,false);

  DELETE FROM ph_workflow_transitions WHERE project_id=v_proj AND work_item_type='BRD Task';
  INSERT INTO ph_workflow_transitions (project_id,work_item_type,from_status_id,to_status_id) VALUES
    (v_proj,'BRD Task',s_brd_bl,s_figma),(v_proj,'BRD Task',s_brd_bl,s_rimpl),
    (v_proj,'BRD Task',s_figma,s_brd_prep),(v_proj,'BRD Task',s_brd_prep,s_brd_rev),
    (v_proj,'BRD Task',s_brd_rev,s_dval),(v_proj,'BRD Task',s_brd_rev,s_figma),
    (v_proj,'BRD Task',s_dval,s_brd_so),(v_proj,'BRD Task',s_dval,s_figma),
    (v_proj,'BRD Task',s_brd_so,s_rimpl),(v_proj,'BRD Task',s_brd_so,s_figma),
    (v_proj,'BRD Task',s_brd_so,s_done),(v_proj,'BRD Task',s_rimpl,s_done),
    (v_proj,'BRD Task',NULL,s_blocked),(v_proj,'BRD Task',NULL,s_canceled),
    (v_proj,'BRD Task',NULL,s_done);

END $$;
