-- CAT-WORKFLOW-STUDIO-20260702-001 / P1.1 — draft write path for the canonical engine
--
-- Until now every ph_wf_* child table was effectively read-only from the app
-- (admin panel is a viewer). This adds:
--   1. ph_wf_assert_admin()            — raise-style guard for RPCs
--   2. ph_wf_child_guard trigger       — blocks direct client mutation of any
--      status/transition/role/guard/field-req row whose version is not a draft.
--      Privileged contexts (postgres, supabase_admin, service_role) bypass so
--      migrations/seeds keep working; SECURITY DEFINER RPCs below therefore
--      also bypass and enforce draft-ness themselves.
--   3. Draft CRUD RPCs (SECURITY DEFINER, admin-only, audited):
--      ph_wf_create_draft, ph_wf_upsert_draft_status, ph_wf_delete_draft_status,
--      ph_wf_upsert_draft_transition, ph_wf_delete_draft_transition,
--      ph_wf_set_transition_roles, ph_wf_set_transition_guards,
--      ph_wf_set_field_requirements, ph_wf_discard_draft, ph_wf_validate_draft
--   4. ph_wf_versions.layout jsonb     — diagram node positions (UI metadata only)

ALTER TABLE public.ph_wf_versions ADD COLUMN IF NOT EXISTS layout jsonb;

-- ---------------------------------------------------------------------------
-- 1. Admin assert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_assert_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.ph_wf_is_admin() THEN
    RAISE EXCEPTION 'ph_wf: admin role required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Draft guard trigger on the 5 version-child tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_is_privileged_ctx()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user IN ('postgres','supabase_admin','supabase_auth_admin')
      OR COALESCE(
           NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
           ''
         ) = 'service_role';
$$;

-- NOT security definer on purpose: with SECURITY DEFINER the body would run as
-- the function owner (postgres) and ph_wf_is_privileged_ctx() would always
-- report privileged, silently disabling the guard for every client. Running as
-- invoker keeps current_user = authenticated for PostgREST writes (versions
-- are SELECT-able by authenticated, so the lookup works) while DML executed
-- inside the SECURITY DEFINER RPCs below still bypasses (current_user = owner).
CREATE OR REPLACE FUNCTION public.ph_wf_child_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_lifecycle  text;
BEGIN
  IF public.ph_wf_is_privileged_ctx() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME IN ('ph_wf_transition_roles','ph_wf_transition_guards') THEN
    SELECT t.version_id INTO v_version_id
    FROM public.ph_wf_version_transitions t
    WHERE t.id = COALESCE(NEW.transition_id, OLD.transition_id);
  ELSE
    v_version_id := COALESCE(NEW.version_id, OLD.version_id);
  END IF;

  SELECT v.lifecycle INTO v_lifecycle
  FROM public.ph_wf_versions v WHERE v.id = v_version_id;

  IF v_lifecycle IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'ph_wf: version % is % — only drafts are editable (create a draft first)',
      v_version_id, COALESCE(v_lifecycle, 'missing')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ph_wf_version_statuses','ph_wf_version_transitions',
    'ph_wf_transition_roles','ph_wf_transition_guards','ph_wf_field_requirements'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', t||'_draft_guard', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ph_wf_child_guard();',
      t||'_draft_guard', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- helpers shared by the RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_require_draft(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lifecycle text;
BEGIN
  SELECT lifecycle INTO v_lifecycle FROM public.ph_wf_versions WHERE id = p_version_id;
  IF v_lifecycle IS NULL THEN
    RAISE EXCEPTION 'ph_wf: version % not found', p_version_id USING ERRCODE = 'P0002';
  END IF;
  IF v_lifecycle <> 'draft' THEN
    RAISE EXCEPTION 'ph_wf: version % is % — only drafts are editable', p_version_id, v_lifecycle
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ph_wf_admin_log(
  p_action text, p_target_kind text, p_target_ids uuid[], p_diff jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.ph_wf_admin_audit (action, target_kind, target_ids, actor, diff_json)
  VALUES (p_action, p_target_kind, p_target_ids, auth.uid(), COALESCE(p_diff, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- 3a. ph_wf_create_draft — clone published (or start blank) into a new draft
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_create_draft(
  p_entity_key      text,
  p_from_version_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src         public.ph_wf_versions%ROWTYPE;
  v_template_id uuid;
  v_entity      text := p_entity_key;
  v_existing    uuid;
  v_new_id      uuid;
  v_next_no     integer;
  r_tr          record;
  v_new_tr_id   uuid;
BEGIN
  PERFORM public.ph_wf_assert_admin();

  IF p_from_version_id IS NOT NULL THEN
    SELECT * INTO v_src FROM public.ph_wf_versions WHERE id = p_from_version_id;
    IF v_src.id IS NULL THEN
      RAISE EXCEPTION 'ph_wf: source version % not found', p_from_version_id USING ERRCODE = 'P0002';
    END IF;
    v_template_id := v_src.template_id;
    v_entity      := v_src.entity_key;
  END IF;

  IF v_entity IS NULL THEN
    RAISE EXCEPTION 'ph_wf: entity_key required when no source version given' USING ERRCODE = '22004';
  END IF;

  -- One open draft per entity: hand back the existing one instead of forking.
  SELECT id INTO v_existing
  FROM public.ph_wf_versions
  WHERE entity_key = v_entity AND lifecycle = 'draft'
  ORDER BY created_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_template_id IS NULL THEN
    -- Reuse the entity's latest version's template, else mint one.
    SELECT template_id INTO v_template_id
    FROM public.ph_wf_versions
    WHERE entity_key = v_entity
    ORDER BY version_no DESC LIMIT 1;

    IF v_template_id IS NULL THEN
      INSERT INTO public.ph_workflow_templates (name, work_item_type, description)
      VALUES ('Canonical ' || v_entity, v_entity, 'Created by Workflow Studio')
      ON CONFLICT (name, work_item_type) DO UPDATE SET updated_at = now()
      RETURNING id INTO v_template_id;
    END IF;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_next_no
  FROM public.ph_wf_versions WHERE template_id = v_template_id;

  INSERT INTO public.ph_wf_versions (template_id, entity_key, version_no, lifecycle, notes, layout, created_by)
  VALUES (
    v_template_id, v_entity, v_next_no, 'draft',
    CASE WHEN v_src.id IS NULL THEN 'Blank draft' ELSE 'Draft from v' || v_src.version_no END,
    v_src.layout,
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  IF v_src.id IS NOT NULL THEN
    INSERT INTO public.ph_wf_version_statuses (
      version_id, status_key, display_label, category, lifecycle_group, sort_order,
      color_token, is_initial, is_terminal, is_exception, supports_reopen, requires_reason
    )
    SELECT v_new_id, status_key, display_label, category, lifecycle_group, sort_order,
           color_token, is_initial, is_terminal, is_exception, supports_reopen, requires_reason
    FROM public.ph_wf_version_statuses WHERE version_id = v_src.id;

    FOR r_tr IN
      SELECT * FROM public.ph_wf_version_transitions WHERE version_id = v_src.id
    LOOP
      INSERT INTO public.ph_wf_version_transitions (
        version_id, from_status_key, to_status_key, transition_type,
        requires_reason, requires_comment, sort_order
      )
      VALUES (
        v_new_id, r_tr.from_status_key, r_tr.to_status_key, r_tr.transition_type,
        r_tr.requires_reason, r_tr.requires_comment, r_tr.sort_order
      )
      RETURNING id INTO v_new_tr_id;

      INSERT INTO public.ph_wf_transition_roles (
        transition_id, role_group, allow_assignee, allow_reporter,
        allow_super_admin_bypass, bypass_requires_reason
      )
      SELECT v_new_tr_id, role_group, allow_assignee, allow_reporter,
             allow_super_admin_bypass, bypass_requires_reason
      FROM public.ph_wf_transition_roles WHERE transition_id = r_tr.id;

      INSERT INTO public.ph_wf_transition_guards (
        transition_id, guard_type, params, is_blocking, waiver_allowed, sort_order
      )
      SELECT v_new_tr_id, guard_type, params, is_blocking, waiver_allowed, sort_order
      FROM public.ph_wf_transition_guards WHERE transition_id = r_tr.id;

      INSERT INTO public.ph_wf_field_requirements (version_id, scope, status_key, transition_id, field_key, requirement)
      SELECT v_new_id, scope, NULL, v_new_tr_id, field_key, requirement
      FROM public.ph_wf_field_requirements
      WHERE version_id = v_src.id AND transition_id = r_tr.id;
    END LOOP;

    INSERT INTO public.ph_wf_field_requirements (version_id, scope, status_key, transition_id, field_key, requirement)
    SELECT v_new_id, scope, status_key, NULL, field_key, requirement
    FROM public.ph_wf_field_requirements
    WHERE version_id = v_src.id AND status_key IS NOT NULL;
  END IF;

  PERFORM public.ph_wf_admin_log(
    'draft_created', 'version', ARRAY[v_new_id],
    jsonb_build_object('entity_key', v_entity, 'from_version_id', p_from_version_id, 'version_no', v_next_no)
  );
  RETURN v_new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3b. status upsert / delete (draft only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_upsert_draft_status(p_version_id uuid, p_status jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);

  IF COALESCE((p_status->>'is_initial')::boolean, false) THEN
    UPDATE public.ph_wf_version_statuses
    SET is_initial = false
    WHERE version_id = p_version_id AND status_key <> (p_status->>'status_key');
  END IF;

  INSERT INTO public.ph_wf_version_statuses (
    version_id, status_key, display_label, category, lifecycle_group, sort_order,
    color_token, is_initial, is_terminal, is_exception, supports_reopen, requires_reason
  )
  VALUES (
    p_version_id,
    p_status->>'status_key',
    COALESCE(p_status->>'display_label', p_status->>'status_key'),
    COALESCE(p_status->>'category', 'todo'),
    p_status->>'lifecycle_group',
    COALESCE((p_status->>'sort_order')::integer, 0),
    COALESCE(p_status->>'color_token', 'color.background.neutral'),
    COALESCE((p_status->>'is_initial')::boolean, false),
    COALESCE((p_status->>'is_terminal')::boolean, false),
    COALESCE((p_status->>'is_exception')::boolean, false),
    COALESCE((p_status->>'supports_reopen')::boolean, false),
    COALESCE((p_status->>'requires_reason')::boolean, false)
  )
  ON CONFLICT (version_id, status_key) DO UPDATE SET
    display_label   = EXCLUDED.display_label,
    category        = EXCLUDED.category,
    lifecycle_group = EXCLUDED.lifecycle_group,
    sort_order      = EXCLUDED.sort_order,
    color_token     = EXCLUDED.color_token,
    is_initial      = EXCLUDED.is_initial,
    is_terminal     = EXCLUDED.is_terminal,
    is_exception    = EXCLUDED.is_exception,
    supports_reopen = EXCLUDED.supports_reopen,
    requires_reason = EXCLUDED.requires_reason
  RETURNING id INTO v_id;

  PERFORM public.ph_wf_admin_log('draft_status_upserted', 'version_status', ARRAY[v_id],
    jsonb_build_object('version_id', p_version_id, 'status', p_status));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ph_wf_delete_draft_status(
  p_version_id uuid, p_status_key text, p_rewire_to text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_touched integer := 0;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);

  IF p_rewire_to IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses
                   WHERE version_id = p_version_id AND status_key = p_rewire_to) THEN
      RAISE EXCEPTION 'ph_wf: rewire target % does not exist in draft', p_rewire_to USING ERRCODE = 'P0002';
    END IF;
    -- Re-point inbound transitions; drop ones that would self-loop or duplicate.
    DELETE FROM public.ph_wf_version_transitions t
    WHERE t.version_id = p_version_id AND t.to_status_key = p_status_key
      AND (t.from_status_key = p_rewire_to
           OR EXISTS (SELECT 1 FROM public.ph_wf_version_transitions d
                      WHERE d.version_id = p_version_id
                        AND d.to_status_key = p_rewire_to
                        AND d.from_status_key IS NOT DISTINCT FROM t.from_status_key));
    UPDATE public.ph_wf_version_transitions
    SET to_status_key = p_rewire_to
    WHERE version_id = p_version_id AND to_status_key = p_status_key;
  ELSE
    DELETE FROM public.ph_wf_version_transitions
    WHERE version_id = p_version_id AND to_status_key = p_status_key;
  END IF;

  -- Outbound transitions from the deleted status always go.
  DELETE FROM public.ph_wf_version_transitions
  WHERE version_id = p_version_id AND from_status_key = p_status_key;

  DELETE FROM public.ph_wf_field_requirements
  WHERE version_id = p_version_id AND status_key = p_status_key;

  DELETE FROM public.ph_wf_version_statuses
  WHERE version_id = p_version_id AND status_key = p_status_key;
  GET DIAGNOSTICS v_touched = ROW_COUNT;

  PERFORM public.ph_wf_admin_log('draft_status_deleted', 'version', ARRAY[p_version_id],
    jsonb_build_object('status_key', p_status_key, 'rewire_to', p_rewire_to));
  RETURN v_touched;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3c. transition upsert / delete (draft only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_upsert_draft_transition(p_version_id uuid, p_transition jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid := NULLIF(p_transition->>'id','')::uuid;
  v_from text := NULLIF(p_transition->>'from_status_key','');
  v_to   text := p_transition->>'to_status_key';
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);

  IF v_to IS NULL THEN
    RAISE EXCEPTION 'ph_wf: to_status_key required' USING ERRCODE = '22004';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses
                 WHERE version_id = p_version_id AND status_key = v_to) THEN
    RAISE EXCEPTION 'ph_wf: to_status_key % not in draft', v_to USING ERRCODE = 'P0002';
  END IF;
  IF v_from IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses
                 WHERE version_id = p_version_id AND status_key = v_from) THEN
    RAISE EXCEPTION 'ph_wf: from_status_key % not in draft', v_from USING ERRCODE = 'P0002';
  END IF;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.ph_wf_version_transitions
    WHERE version_id = p_version_id
      AND from_status_key IS NOT DISTINCT FROM v_from
      AND to_status_key = v_to;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.ph_wf_version_transitions (
      version_id, from_status_key, to_status_key, transition_type,
      requires_reason, requires_comment, sort_order
    )
    VALUES (
      p_version_id, v_from, v_to,
      COALESCE(p_transition->>'transition_type', 'forward'),
      COALESCE((p_transition->>'requires_reason')::boolean, false),
      COALESCE((p_transition->>'requires_comment')::boolean, false),
      COALESCE((p_transition->>'sort_order')::integer, 0)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.ph_wf_version_transitions SET
      from_status_key  = v_from,
      to_status_key    = v_to,
      transition_type  = COALESCE(p_transition->>'transition_type', transition_type),
      requires_reason  = COALESCE((p_transition->>'requires_reason')::boolean, requires_reason),
      requires_comment = COALESCE((p_transition->>'requires_comment')::boolean, requires_comment),
      sort_order       = COALESCE((p_transition->>'sort_order')::integer, sort_order)
    WHERE id = v_id;
  END IF;

  PERFORM public.ph_wf_admin_log('draft_transition_upserted', 'version_transition', ARRAY[v_id],
    jsonb_build_object('version_id', p_version_id, 'transition', p_transition));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ph_wf_delete_draft_transition(p_transition_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_version_id uuid;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  SELECT version_id INTO v_version_id FROM public.ph_wf_version_transitions WHERE id = p_transition_id;
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'ph_wf: transition % not found', p_transition_id USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.ph_wf_require_draft(v_version_id);

  DELETE FROM public.ph_wf_field_requirements WHERE transition_id = p_transition_id;
  DELETE FROM public.ph_wf_version_transitions WHERE id = p_transition_id;

  PERFORM public.ph_wf_admin_log('draft_transition_deleted', 'version', ARRAY[v_version_id],
    jsonb_build_object('transition_id', p_transition_id));
END;
$$;

-- ---------------------------------------------------------------------------
-- 3d. bulk-replace roles / guards on a transition (draft only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_set_transition_roles(p_transition_id uuid, p_roles jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_version_id uuid; v_n integer;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  SELECT version_id INTO v_version_id FROM public.ph_wf_version_transitions WHERE id = p_transition_id;
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'ph_wf: transition % not found', p_transition_id USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.ph_wf_require_draft(v_version_id);

  DELETE FROM public.ph_wf_transition_roles WHERE transition_id = p_transition_id;
  INSERT INTO public.ph_wf_transition_roles (
    transition_id, role_group, allow_assignee, allow_reporter,
    allow_super_admin_bypass, bypass_requires_reason
  )
  SELECT p_transition_id,
         r->>'role_group',
         COALESCE((r->>'allow_assignee')::boolean, false),
         COALESCE((r->>'allow_reporter')::boolean, false),
         COALESCE((r->>'allow_super_admin_bypass')::boolean, true),
         COALESCE((r->>'bypass_requires_reason')::boolean, true)
  FROM jsonb_array_elements(COALESCE(p_roles, '[]'::jsonb)) r
  WHERE r->>'role_group' IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  PERFORM public.ph_wf_admin_log('draft_transition_roles_set', 'version_transition', ARRAY[p_transition_id],
    jsonb_build_object('roles', p_roles));
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.ph_wf_set_transition_guards(p_transition_id uuid, p_guards jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_version_id uuid; v_n integer;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  SELECT version_id INTO v_version_id FROM public.ph_wf_version_transitions WHERE id = p_transition_id;
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'ph_wf: transition % not found', p_transition_id USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.ph_wf_require_draft(v_version_id);

  DELETE FROM public.ph_wf_transition_guards WHERE transition_id = p_transition_id;
  INSERT INTO public.ph_wf_transition_guards (
    transition_id, guard_type, params, is_blocking, waiver_allowed, sort_order
  )
  SELECT p_transition_id,
         g->>'guard_type',
         COALESCE(g->'params', '{}'::jsonb),
         COALESCE((g->>'is_blocking')::boolean, true),
         COALESCE((g->>'waiver_allowed')::boolean, false),
         COALESCE((g->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_guards, '[]'::jsonb)) g
  WHERE g->>'guard_type' IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  PERFORM public.ph_wf_admin_log('draft_transition_guards_set', 'version_transition', ARRAY[p_transition_id],
    jsonb_build_object('guards', p_guards));
  RETURN v_n;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3e. bulk-replace field requirements for a draft version
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_set_field_requirements(p_version_id uuid, p_reqs jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n integer;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);

  DELETE FROM public.ph_wf_field_requirements WHERE version_id = p_version_id;
  INSERT INTO public.ph_wf_field_requirements (version_id, scope, status_key, transition_id, field_key, requirement)
  SELECT p_version_id,
         r->>'scope',
         NULLIF(r->>'status_key',''),
         NULLIF(r->>'transition_id','')::uuid,
         r->>'field_key',
         r->>'requirement'
  FROM jsonb_array_elements(COALESCE(p_reqs, '[]'::jsonb)) r;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  PERFORM public.ph_wf_admin_log('draft_field_requirements_set', 'version', ARRAY[p_version_id],
    jsonb_build_object('count', v_n));
  RETURN v_n;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3f. discard draft
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_discard_draft(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);

  UPDATE public.ph_wf_versions SET lifecycle = 'archived' WHERE id = p_version_id;

  PERFORM public.ph_wf_admin_log('draft_discarded', 'version', ARRAY[p_version_id], '{}'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3g. validate draft — structural checks before publish
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_validate_draft(p_version_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues        jsonb := '[]'::jsonb;
  v_initial_count integer;
  v_initial_key   text;
  v_status_count  integer;
  v_reachable     text[];
  v_frontier      text[];
  v_next          text[];
  v_unreachable   text[];
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ph_wf_versions WHERE id = p_version_id) THEN
    RETURN jsonb_build_object('ok', false, 'issues',
      jsonb_build_array(jsonb_build_object('code','not_found','detail','version not found')));
  END IF;

  SELECT COUNT(*) INTO v_status_count
  FROM public.ph_wf_version_statuses WHERE version_id = p_version_id;
  IF v_status_count = 0 THEN
    v_issues := v_issues || jsonb_build_object('code','no_statuses','detail','draft has no statuses');
  END IF;

  SELECT COUNT(*) FILTER (WHERE is_initial), MIN(status_key) FILTER (WHERE is_initial)
  INTO v_initial_count, v_initial_key
  FROM public.ph_wf_version_statuses WHERE version_id = p_version_id;
  IF v_initial_count <> 1 THEN
    v_issues := v_issues || jsonb_build_object('code','initial_count',
      'detail', format('exactly one initial status required, found %s', v_initial_count));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses
                 WHERE version_id = p_version_id AND is_terminal) THEN
    v_issues := v_issues || jsonb_build_object('code','no_terminal','detail','no terminal status');
  END IF;

  FOR r IN
    SELECT t.id, t.from_status_key, t.to_status_key
    FROM public.ph_wf_version_transitions t
    WHERE t.version_id = p_version_id
      AND (
        NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses s
                    WHERE s.version_id = p_version_id AND s.status_key = t.to_status_key)
        OR (t.from_status_key IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM public.ph_wf_version_statuses s
              WHERE s.version_id = p_version_id AND s.status_key = t.from_status_key))
      )
  LOOP
    v_issues := v_issues || jsonb_build_object('code','dangling_transition',
      'detail', format('%s → %s references a missing status', COALESCE(r.from_status_key,'(any)'), r.to_status_key));
  END LOOP;

  -- Reachability from the initial status. Global-IN (from NULL) targets are
  -- reachable by definition once any status is reachable.
  IF v_initial_count = 1 AND v_status_count > 0 THEN
    v_reachable := ARRAY[v_initial_key]
      || ARRAY(SELECT DISTINCT to_status_key FROM public.ph_wf_version_transitions
               WHERE version_id = p_version_id AND from_status_key IS NULL);
    v_frontier := v_reachable;
    LOOP
      v_next := ARRAY(
        SELECT DISTINCT t.to_status_key
        FROM public.ph_wf_version_transitions t
        WHERE t.version_id = p_version_id
          AND t.from_status_key = ANY(v_frontier)
          AND NOT t.to_status_key = ANY(v_reachable)
      );
      EXIT WHEN COALESCE(array_length(v_next, 1), 0) = 0;
      v_reachable := v_reachable || v_next;
      v_frontier  := v_next;
    END LOOP;

    v_unreachable := ARRAY(
      SELECT s.status_key FROM public.ph_wf_version_statuses s
      WHERE s.version_id = p_version_id AND NOT s.status_key = ANY(v_reachable)
    );
    IF COALESCE(array_length(v_unreachable, 1), 0) > 0 THEN
      v_issues := v_issues || jsonb_build_object('code','unreachable',
        'detail', 'unreachable from initial: ' || array_to_string(v_unreachable, ', '));
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', jsonb_array_length(v_issues) = 0, 'issues', v_issues);
END;
$$;

-- ---------------------------------------------------------------------------
-- grants — RPC surface for authenticated (each asserts admin internally)
-- ---------------------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'ph_wf_assert_admin()',
    'ph_wf_create_draft(text, uuid)',
    'ph_wf_upsert_draft_status(uuid, jsonb)',
    'ph_wf_delete_draft_status(uuid, text, text)',
    'ph_wf_upsert_draft_transition(uuid, jsonb)',
    'ph_wf_delete_draft_transition(uuid)',
    'ph_wf_set_transition_roles(uuid, jsonb)',
    'ph_wf_set_transition_guards(uuid, jsonb)',
    'ph_wf_set_field_requirements(uuid, jsonb)',
    'ph_wf_discard_draft(uuid)',
    'ph_wf_validate_draft(uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated;', fn);
  END LOOP;
END $$;
