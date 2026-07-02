-- CAT-WORKFLOW-STUDIO-20260702-001 / Phase D — CRE compliance (C3)
--
-- P3.1 seeded ph_hierarchy_parent_rules from the legacy TS constants
-- (parent-rules.ts). CRE's locked RULE_TABLE.md Grid B is the authority and
-- diverges: Business Request's only structural child is Epic (B1); QA Bug /
-- Production Incident / Change Request / Business Gap / Task parent under
-- Epic (B2); Story additionally under Feature (B3); the subtask family
-- parents under Epic/Story/Task/QA Bug/Production Incident/Change Request
-- (B2, B4–B8); Business Gap and subtasks are leaves (B9, B10).
-- This wipes SYSTEM-type rules and reseeds them exactly per Grid B.
-- Custom-type rules (is_system = false children) are untouched.
-- Milestone/Release/Sprint are not Grid B entities — Milestone keeps
-- BR-or-root as a registry-only rule, explicitly outside CRE.

DO $$
DECLARE
  t_br uuid; t_ms uuid; t_epic uuid; t_feature uuid; t_story uuid; t_task uuid;
  t_qabug uuid; t_incident uuid; t_cr uuid; t_gap uuid;
  t_sub uuid; t_backend uuid; t_frontend uuid; t_integration uuid; t_figma uuid;
  t_api uuid; t_brdtask uuid; t_uat uuid;
BEGIN
  SELECT id INTO t_br       FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'business_request';
  SELECT id INTO t_ms       FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'product_milestone';
  SELECT id INTO t_epic     FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'epic';
  SELECT id INTO t_feature  FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'feature';
  SELECT id INTO t_story    FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'story';
  SELECT id INTO t_task     FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'task';
  SELECT id INTO t_qabug    FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'qa_bug';
  SELECT id INTO t_incident FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'production_incident';
  SELECT id INTO t_cr       FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'change_request';
  SELECT id INTO t_gap      FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'business_gap';
  SELECT id INTO t_sub      FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'sub_task';
  SELECT id INTO t_backend  FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'backend';
  SELECT id INTO t_frontend FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'frontend';
  SELECT id INTO t_integration FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'integration';
  SELECT id INTO t_figma    FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'figma';
  SELECT id INTO t_api      FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'api_requirement';
  SELECT id INTO t_brdtask  FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'brd_task';
  SELECT id INTO t_uat      FROM public.ph_work_item_types WHERE org_id IS NULL AND type_key = 'uat_finding';

  -- Wipe system-type rules only.
  DELETE FROM public.ph_hierarchy_parent_rules r
  USING public.ph_work_item_types c
  WHERE r.child_type_id = c.id AND c.is_system = true;

  -- Reseed exactly per RULE_TABLE.md Grid B (child -> allowed parent; NULL = root).
  INSERT INTO public.ph_hierarchy_parent_rules (child_type_id, parent_type_id)
  SELECT c, p FROM (VALUES
    (t_br,       NULL::uuid),                        -- BR: root only
    (t_ms,       t_br), (t_ms, NULL),                -- Milestone: registry-only, outside Grid B
    (t_epic,     t_br), (t_epic, NULL),              -- B1 (+ standalone epic)
    (t_feature,  t_epic),                            -- B2
    (t_story,    t_epic), (t_story, t_feature),      -- B2 + B3
    (t_task,     t_epic), (t_task, NULL),            -- B2 (+ project-less task)
    (t_qabug,    t_epic),                            -- B2
    (t_incident, t_epic),                            -- B2
    (t_cr,       t_epic),                            -- B2
    (t_gap,      t_epic),                            -- B2 (leaf per B9)
    -- Subtask family: children of Epic, Story, Task, QA Bug, PI, CR (B2, B4-B8)
    (t_sub, t_epic), (t_sub, t_story), (t_sub, t_task), (t_sub, t_qabug), (t_sub, t_incident), (t_sub, t_cr),
    (t_backend, t_epic), (t_backend, t_story), (t_backend, t_task), (t_backend, t_qabug), (t_backend, t_incident), (t_backend, t_cr),
    (t_frontend, t_epic), (t_frontend, t_story), (t_frontend, t_task), (t_frontend, t_qabug), (t_frontend, t_incident), (t_frontend, t_cr),
    (t_integration, t_epic), (t_integration, t_story), (t_integration, t_task), (t_integration, t_qabug), (t_integration, t_incident), (t_integration, t_cr),
    (t_figma, t_epic), (t_figma, t_story), (t_figma, t_task), (t_figma, t_qabug), (t_figma, t_incident), (t_figma, t_cr),
    (t_api, t_epic), (t_api, t_story), (t_api, t_task), (t_api, t_qabug), (t_api, t_incident), (t_api, t_cr),
    (t_brdtask, t_epic), (t_brdtask, t_story), (t_brdtask, t_task), (t_brdtask, t_qabug), (t_brdtask, t_incident), (t_brdtask, t_cr),
    (t_uat, t_epic), (t_uat, t_story), (t_uat, t_task), (t_uat, t_qabug), (t_uat, t_incident), (t_uat, t_cr)
  ) AS v(c, p)
  WHERE c IS NOT NULL;
END $$;
