-- Seed canonical Story workflow (11 statuses) for BAU project.
-- Statuses match the Jira Story workflow diagram (2026-06-21).
-- Idempotent via WHERE NOT EXISTS guards.
DO $$
DECLARE
  v_proj UUID := '84f91caf-7511-470a-9a26-3e52e66258bf';
  s_req UUID; s_design UUID; s_rfd UUID; s_dev UUID; s_qa UUID;
  s_uat UUID; s_beta UUID; s_prodready UUID; s_betaready UUID;
  s_inprod UUID; s_onhold UUID;
BEGIN

  INSERT INTO ph_workflow_statuses (id,project_id,name,category,color,position,is_default)
    SELECT gen_random_uuid(),v_proj,'Production Ready','done','#94C748',1017,false
    WHERE NOT EXISTS(SELECT 1 FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='production ready' AND archived_at IS NULL);

  SELECT id INTO s_req       FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in requirements' AND archived_at IS NULL;
  SELECT id INTO s_design    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in design' AND archived_at IS NULL;
  SELECT id INTO s_rfd       FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='ready for development' AND archived_at IS NULL;
  SELECT id INTO s_dev       FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in development' AND archived_at IS NULL;
  SELECT id INTO s_qa        FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in qa' AND archived_at IS NULL;
  SELECT id INTO s_uat       FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in uat' AND archived_at IS NULL;
  SELECT id INTO s_beta      FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in beta' AND archived_at IS NULL;
  SELECT id INTO s_prodready FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='production ready' AND archived_at IS NULL;
  SELECT id INTO s_betaready FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='beta ready' AND archived_at IS NULL;
  SELECT id INTO s_inprod    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='in production' AND archived_at IS NULL;
  SELECT id INTO s_onhold    FROM ph_workflow_statuses WHERE project_id=v_proj AND LOWER(name)='on hold' AND archived_at IS NULL;

  DELETE FROM ph_workflow_type_statuses WHERE project_id=v_proj AND work_item_type='Story';
  INSERT INTO ph_workflow_type_statuses (project_id,work_item_type,status_id,position,is_initial) VALUES
    (v_proj,'Story',s_req,0,true),(v_proj,'Story',s_design,1,false),
    (v_proj,'Story',s_rfd,2,false),(v_proj,'Story',s_dev,3,false),
    (v_proj,'Story',s_qa,4,false),(v_proj,'Story',s_uat,5,false),
    (v_proj,'Story',s_beta,6,false),(v_proj,'Story',s_prodready,7,false),
    (v_proj,'Story',s_betaready,8,false),(v_proj,'Story',s_inprod,9,false),
    (v_proj,'Story',s_onhold,10,false);

  DELETE FROM ph_workflow_transitions WHERE project_id=v_proj AND work_item_type='Story';
  INSERT INTO ph_workflow_transitions (project_id,work_item_type,from_status_id,to_status_id) VALUES
    (v_proj,'Story',s_req,s_design),
    (v_proj,'Story',s_req,s_rfd),
    (v_proj,'Story',s_design,s_req),
    (v_proj,'Story',s_design,s_rfd),
    (v_proj,'Story',s_rfd,s_dev),
    (v_proj,'Story',s_dev,s_rfd),
    (v_proj,'Story',s_dev,s_qa),
    (v_proj,'Story',s_dev,s_onhold),
    (v_proj,'Story',s_qa,s_dev),
    (v_proj,'Story',s_qa,s_uat),
    (v_proj,'Story',s_uat,s_beta),
    (v_proj,'Story',s_beta,s_uat),
    (v_proj,'Story',s_beta,s_prodready),
    (v_proj,'Story',s_beta,s_betaready),
    (v_proj,'Story',s_beta,s_inprod),
    (v_proj,'Story',s_betaready,s_beta),
    (v_proj,'Story',s_betaready,s_prodready),
    (v_proj,'Story',s_prodready,s_inprod),
    (v_proj,'Story',s_inprod,s_beta),
    (v_proj,'Story',s_onhold,s_dev);

END $$;
