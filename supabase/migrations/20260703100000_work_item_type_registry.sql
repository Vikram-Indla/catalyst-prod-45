-- CAT-WORKFLOW-STUDIO-20260702-001 / P3.1 — data-driven work item type registry
--
-- Replaces the 11 competing hardcoded TS type registries with three tables:
--   ph_hierarchy_levels      — configurable hierarchy (rank 0..9 = max 10 levels)
--   ph_work_item_types       — org-scoped type registry (main + subtask kinds)
--   ph_hierarchy_parent_rules— which type may parent which (replaces the
--                              parent-rules.ts / hierarchy.ts TS constants)
-- Existing unused ph_work_types / wh_work_types stay frozen (wrong shapes:
-- 4-bucket level CHECK, hex colors). ph_issues.type_id backfill + CHECK swap
-- arrive in P3.3; nothing here touches live work items.
-- All idempotent; seeds are system rows (is_system) the UI cannot delete.

-- ---------------------------------------------------------------------------
-- 1. Hierarchy levels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ph_hierarchy_levels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid,                                   -- NULL = global/system
  level_rank  integer NOT NULL,
  name        text NOT NULL,
  icon        text,
  color_token text,
  is_enabled  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_hier_levels_rank_chk CHECK (level_rank BETWEEN 0 AND 9),
  CONSTRAINT ph_hier_levels_token_chk CHECK (
    color_token IS NULL OR (color_token ~ '^(color\.|var\(--ds-)' AND color_token !~ '#')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS ph_hier_levels_uq
  ON public.ph_hierarchy_levels (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), level_rank);

-- ---------------------------------------------------------------------------
-- 2. Work item types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ph_work_item_types (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid,                       -- NULL = global/system
  type_key                text NOT NULL,              -- slug: 'story','qa_bug','risk'
  display_name            text NOT NULL,              -- Jira-facing: 'QA Bug'
  description             text,
  icon                    text NOT NULL DEFAULT 'task',  -- icons.registry id
  color_token             text NOT NULL DEFAULT 'color.icon.accent.blue',
  kind                    text NOT NULL DEFAULT 'standard',
  group_key               text NOT NULL DEFAULT 'standard',
  hierarchy_level_id      uuid REFERENCES public.ph_hierarchy_levels(id) ON DELETE SET NULL,
  entity_key              text,                       -- maps to ph_wf_versions.entity_key
  default_wf_template_id  uuid REFERENCES public.ph_workflow_templates(id) ON DELETE SET NULL,
  is_system               boolean NOT NULL DEFAULT false,
  is_enabled              boolean NOT NULL DEFAULT true,
  sort_order              integer NOT NULL DEFAULT 0,
  created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  archived_at             timestamptz,
  CONSTRAINT ph_wit_kind_chk  CHECK (kind IN ('standard','subtask')),
  CONSTRAINT ph_wit_group_chk CHECK (group_key IN ('standard','qa','business','technical')),
  CONSTRAINT ph_wit_token_chk CHECK (color_token ~ '^(color\.|var\(--ds-)' AND color_token !~ '#')
);
CREATE UNIQUE INDEX IF NOT EXISTS ph_wit_key_uq
  ON public.ph_work_item_types (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(type_key));
CREATE UNIQUE INDEX IF NOT EXISTS ph_wit_name_uq
  ON public.ph_work_item_types (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(display_name))
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Parent rules (pairwise: child type -> allowed parent type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ph_hierarchy_parent_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_type_id  uuid NOT NULL REFERENCES public.ph_work_item_types(id) ON DELETE CASCADE,
  parent_type_id uuid REFERENCES public.ph_work_item_types(id) ON DELETE CASCADE, -- NULL = may be root
  is_required    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ph_hier_rules_uq
  ON public.ph_hierarchy_parent_rules (child_type_id, COALESCE(parent_type_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- updated_at touch triggers (reuse ph_wf helper)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ph_hierarchy_levels','ph_work_item_types']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', t||'_touch', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ph_wf_touch_updated_at();',
      t||'_touch', t);
  END LOOP;
END $$;

-- RLS: everyone reads, writes only via the SECURITY DEFINER RPCs below.
ALTER TABLE public.ph_hierarchy_levels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_work_item_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_hierarchy_parent_rules ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ph_hierarchy_levels','ph_work_item_types','ph_hierarchy_parent_rules']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t||'_read') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);', t||'_read', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RPCs (admin-asserted, audited)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hi_upsert_level(p_level jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid := NULLIF(p_level->>'id','')::uuid;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  IF v_id IS NULL THEN
    INSERT INTO public.ph_hierarchy_levels (org_id, level_rank, name, icon, color_token, is_enabled)
    VALUES (
      NULLIF(p_level->>'org_id','')::uuid,
      (p_level->>'level_rank')::integer,
      p_level->>'name',
      p_level->>'icon',
      p_level->>'color_token',
      COALESCE((p_level->>'is_enabled')::boolean, true)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.ph_hierarchy_levels SET
      level_rank  = COALESCE((p_level->>'level_rank')::integer, level_rank),
      name        = COALESCE(p_level->>'name', name),
      icon        = COALESCE(p_level->>'icon', icon),
      color_token = COALESCE(p_level->>'color_token', color_token),
      is_enabled  = COALESCE((p_level->>'is_enabled')::boolean, is_enabled)
    WHERE id = v_id;
  END IF;
  PERFORM public.ph_wf_admin_log('hierarchy_level_upserted', 'hierarchy_level', ARRAY[v_id], p_level);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_upsert_work_item_type(p_type jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := NULLIF(p_type->>'id','')::uuid;
  v_is_system boolean;
BEGIN
  PERFORM public.ph_wf_assert_admin();

  IF v_id IS NULL THEN
    INSERT INTO public.ph_work_item_types (
      org_id, type_key, display_name, description, icon, color_token,
      kind, group_key, hierarchy_level_id, entity_key, default_wf_template_id,
      sort_order, created_by
    )
    VALUES (
      NULLIF(p_type->>'org_id','')::uuid,
      p_type->>'type_key',
      p_type->>'display_name',
      p_type->>'description',
      COALESCE(p_type->>'icon', 'task'),
      COALESCE(p_type->>'color_token', 'color.icon.accent.blue'),
      COALESCE(p_type->>'kind', 'standard'),
      COALESCE(p_type->>'group_key', 'standard'),
      NULLIF(p_type->>'hierarchy_level_id','')::uuid,
      NULLIF(p_type->>'entity_key',''),
      NULLIF(p_type->>'default_wf_template_id','')::uuid,
      COALESCE((p_type->>'sort_order')::integer, 0),
      auth.uid()
    )
    RETURNING id INTO v_id;
  ELSE
    SELECT is_system INTO v_is_system FROM public.ph_work_item_types WHERE id = v_id;
    IF v_is_system IS NULL THEN
      RAISE EXCEPTION 'wt: type % not found', v_id USING ERRCODE = 'P0002';
    END IF;
    -- System types: identity is frozen (key/name/kind); presentation + wiring editable.
    UPDATE public.ph_work_item_types SET
      display_name           = CASE WHEN is_system THEN display_name ELSE COALESCE(p_type->>'display_name', display_name) END,
      description            = COALESCE(p_type->>'description', description),
      icon                   = COALESCE(p_type->>'icon', icon),
      color_token            = COALESCE(p_type->>'color_token', color_token),
      kind                   = CASE WHEN is_system THEN kind ELSE COALESCE(p_type->>'kind', kind) END,
      group_key              = COALESCE(p_type->>'group_key', group_key),
      hierarchy_level_id     = COALESCE(NULLIF(p_type->>'hierarchy_level_id','')::uuid, hierarchy_level_id),
      entity_key             = COALESCE(NULLIF(p_type->>'entity_key',''), entity_key),
      default_wf_template_id = COALESCE(NULLIF(p_type->>'default_wf_template_id','')::uuid, default_wf_template_id),
      is_enabled             = COALESCE((p_type->>'is_enabled')::boolean, is_enabled),
      sort_order             = COALESCE((p_type->>'sort_order')::integer, sort_order)
    WHERE id = v_id;
  END IF;

  PERFORM public.ph_wf_admin_log('work_item_type_upserted', 'work_item_type', ARRAY[v_id], p_type);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_archive_work_item_type(p_type_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_is_system boolean;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  SELECT is_system INTO v_is_system FROM public.ph_work_item_types WHERE id = p_type_id;
  IF v_is_system IS NULL THEN
    RAISE EXCEPTION 'wt: type % not found', p_type_id USING ERRCODE = 'P0002';
  END IF;
  IF v_is_system THEN
    RAISE EXCEPTION 'wt: system types cannot be archived' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.ph_work_item_types
  SET archived_at = now(), is_enabled = false
  WHERE id = p_type_id;
  PERFORM public.ph_wf_admin_log('work_item_type_archived', 'work_item_type', ARRAY[p_type_id], '{}'::jsonb);
END;
$$;

-- Replace the full allowed-parent set for one child type.
-- p_parent_type_ids: jsonb array of uuid-or-null (null = "may be root").
CREATE OR REPLACE FUNCTION public.hi_set_parent_rules(p_child_type_id uuid, p_parent_type_ids jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n integer;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  DELETE FROM public.ph_hierarchy_parent_rules WHERE child_type_id = p_child_type_id;
  INSERT INTO public.ph_hierarchy_parent_rules (child_type_id, parent_type_id)
  SELECT p_child_type_id, NULLIF(value #>> '{}', '')::uuid
  FROM jsonb_array_elements(COALESCE(p_parent_type_ids, '[]'::jsonb));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM public.ph_wf_admin_log('parent_rules_set', 'work_item_type', ARRAY[p_child_type_id],
    jsonb_build_object('parents', p_parent_type_ids));
  RETURN v_n;
END;
$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'hi_upsert_level(jsonb)',
    'wt_upsert_work_item_type(jsonb)',
    'wt_archive_work_item_type(uuid)',
    'hi_set_parent_rules(uuid, jsonb)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated;', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Seeds (global/system; idempotent via ON CONFLICT DO NOTHING on the
--    unique expression indexes — emulated with WHERE NOT EXISTS)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; l6 uuid;
  t_br uuid; t_ms uuid; t_epic uuid; t_feature uuid; t_story uuid; t_task uuid;
  t_qabug uuid; t_incident uuid; t_cr uuid; t_gap uuid;
  t_sub uuid; t_backend uuid; t_frontend uuid; t_integration uuid; t_figma uuid;
  t_api uuid; t_brdtask uuid; t_uat uuid;
BEGIN
  -- Levels (global)
  INSERT INTO public.ph_hierarchy_levels (org_id, level_rank, name)
  SELECT NULL, r, n FROM (VALUES
    (0, 'Business Request'), (1, 'Milestone'), (2, 'Epic'),
    (3, 'Feature'), (4, 'Work item'), (5, 'Subtask')
  ) AS v(r, n)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ph_hierarchy_levels e WHERE e.org_id IS NULL AND e.level_rank = v.r
  );
  SELECT id INTO l1 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 0;
  SELECT id INTO l2 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 1;
  SELECT id INTO l3 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 2;
  SELECT id INTO l4 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 3;
  SELECT id INTO l5 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 4;
  SELECT id INTO l6 FROM public.ph_hierarchy_levels WHERE org_id IS NULL AND level_rank = 5;

  -- Types (global system rows). display_name matches live ph_issues.issue_type
  -- strings exactly where those exist (P3.3 backfills type_id by this name).
  INSERT INTO public.ph_work_item_types
    (org_id, type_key, display_name, icon, kind, group_key, hierarchy_level_id, entity_key, is_system, sort_order)
  SELECT NULL, v.k, v.n, v.i, v.kind, v.grp, v.lvl, v.ek, true, v.ord FROM (VALUES
    ('business_request',    'Business Request',    'business-request',    'standard', 'business',  l1,  'business_request',  10),
    ('product_milestone',   'Milestone',           'release',             'standard', 'business',  l2,  'product_milestone', 20),
    ('epic',                'Epic',                'epic',                'standard', 'standard',  l3,  'epic',              30),
    ('feature',             'Feature',             'feature',             'standard', 'standard',  l4,  'feature',           40),
    ('story',               'Story',               'story',               'standard', 'standard',  l5,  'story',             50),
    ('task',                'Task',                'task',                'standard', 'standard',  l5,  'task',              60),
    ('qa_bug',              'QA Bug',              'qa-bug',              'standard', 'qa',        l5,  'defect',            70),
    ('production_incident', 'Production Incident', 'production-incident', 'standard', 'qa',        l5,  'incident',          80),
    ('change_request',      'Change Request',      'change-request',      'standard', 'business',  l5,  NULL,                90),
    ('business_gap',        'Business Gap',        'business-gap',        'standard', 'business',  l5,  NULL,               100),
    ('release',             'Release',             'release',             'standard', 'business',  NULL,'release',          110),
    ('sprint',              'Sprint',              'task',                'standard', 'business',  NULL,'sprint',           120),
    ('sub_task',            'Sub-task',            'sub-task',            'subtask',  'technical', l6,  'subtask',          130),
    ('backend',             'Backend',             'backend',             'subtask',  'technical', l6,  'subtask',          140),
    ('frontend',            'Frontend',            'frontend',            'subtask',  'technical', l6,  'subtask',          150),
    ('integration',         'Integration',         'integration',         'subtask',  'technical', l6,  'subtask',          160),
    ('figma',               'Figma',               'figma',               'subtask',  'technical', l6,  'subtask',          170),
    ('api_requirement',     'API Requirement',     'api-requirement',     'subtask',  'technical', l6,  'subtask',          180),
    ('brd_task',            'BRD Task',            'brd-task',            'subtask',  'business',  l6,  NULL,               190),
    ('uat_finding',         'UAT Finding',         'uat-finding',         'subtask',  'qa',        l6,  NULL,               200)
  ) AS v(k, n, i, kind, grp, lvl, ek, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ph_work_item_types e WHERE e.org_id IS NULL AND lower(e.type_key) = v.k
  );

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

  -- Parent rules (from src/components/catalyst-detail-views/shared/parent-rules.ts):
  -- NULL parent = may be root.
  INSERT INTO public.ph_hierarchy_parent_rules (child_type_id, parent_type_id)
  SELECT c, p FROM (VALUES
    (t_br,       NULL::uuid),           -- Business Request: root
    (t_ms,       t_br), (t_ms, NULL),   -- Milestone: under BR or root
    (t_epic,     t_br), (t_epic, NULL), -- Epic: under BR or standalone
    (t_feature,  t_epic),
    (t_story,    t_epic), (t_story, t_feature),
    (t_task,     t_story), (t_task, t_epic), (t_task, t_feature), (t_task, NULL),
    (t_qabug,    t_story), (t_qabug, t_epic), (t_qabug, t_feature),
    (t_incident, t_br), (t_incident, t_epic), (t_incident, t_feature),
    (t_cr,       t_epic), (t_cr, t_br),
    (t_gap,      t_br),
    (t_sub,      t_story), (t_sub, t_epic), (t_sub, t_task),
    (t_backend,  t_story), (t_backend, t_epic), (t_backend, t_task),
    (t_frontend, t_story), (t_frontend, t_epic), (t_frontend, t_task),
    (t_integration, t_story), (t_integration, t_epic), (t_integration, t_task),
    (t_figma,    t_story), (t_figma, t_epic), (t_figma, t_task), (t_figma, t_br),
    (t_api,      t_story), (t_api, t_epic), (t_api, t_task),
    (t_brdtask,  t_br),
    (t_uat,      t_br)
  ) AS v(c, p)
  WHERE c IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.ph_hierarchy_parent_rules e
      WHERE e.child_type_id = v.c AND e.parent_type_id IS NOT DISTINCT FROM v.p
    );
END $$;
