-- CAT-WORKFLOW-STUDIO-20260702-001 / P1.2 — lifecycle RPCs for the canonical engine
--
--   ph_wf_publish_version(version, remaps) — validate, require a remap for every
--     status removed vs the current published version, persist remaps, supersede
--     the old version, re-point scheme entries, publish atomically.
--   ph_wf_apply_scheme(scheme, project)    — bind a project to a scheme.
--   ph_wf_reassign_statuses(...)           — batched live-item status move for
--     ph_issues-backed entities (story/epic/feature/subtask/task).
-- All SECURITY DEFINER, admin-asserted, audited to ph_wf_admin_audit.

-- Entities whose live rows live in ph_issues, keyed by canonical entity_key.
CREATE OR REPLACE FUNCTION public.ph_wf_entity_issue_types(p_entity_key text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_entity_key
    WHEN 'story'   THEN ARRAY['Story']
    WHEN 'epic'    THEN ARRAY['Epic']
    WHEN 'feature' THEN ARRAY['Feature']
    WHEN 'task'    THEN ARRAY['Task']
    WHEN 'subtask' THEN ARRAY['Sub-task','Backend','Frontend','Integration','Figma','API Requirement','BRD Task']
    ELSE NULL
  END;
$$;

-- ---------------------------------------------------------------------------
-- ph_wf_publish_version
-- p_remaps: {"old_status_key": "new_status_key", ...} for statuses that the
-- draft removes relative to the currently-published version.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_publish_version(
  p_version_id uuid,
  p_remaps     jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft      public.ph_wf_versions%ROWTYPE;
  v_old        public.ph_wf_versions%ROWTYPE;
  v_validation jsonb;
  v_removed    text[];
  v_missing    text[] := '{}';
  v_bad_target text[] := '{}';
  v_key        text;
  v_target     text;
  v_added      integer;
  v_schemes    integer := 0;
BEGIN
  PERFORM public.ph_wf_assert_admin();
  PERFORM public.ph_wf_require_draft(p_version_id);
  SELECT * INTO v_draft FROM public.ph_wf_versions WHERE id = p_version_id;

  v_validation := public.ph_wf_validate_draft(p_version_id);
  IF NOT (v_validation->>'ok')::boolean THEN
    RAISE EXCEPTION 'ph_wf: draft failed validation: %', v_validation->'issues'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_old
  FROM public.ph_wf_versions
  WHERE entity_key = v_draft.entity_key AND lifecycle = 'published'
  ORDER BY version_no DESC LIMIT 1;

  IF v_old.id IS NOT NULL THEN
    v_removed := ARRAY(
      SELECT o.status_key FROM public.ph_wf_version_statuses o
      WHERE o.version_id = v_old.id
        AND NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses n
                        WHERE n.version_id = p_version_id AND n.status_key = o.status_key)
    );

    FOREACH v_key IN ARRAY COALESCE(v_removed, '{}')
    LOOP
      v_target := p_remaps->>v_key;
      IF v_target IS NULL THEN
        v_missing := v_missing || v_key;
      ELSIF NOT EXISTS (SELECT 1 FROM public.ph_wf_version_statuses
                        WHERE version_id = p_version_id AND status_key = v_target) THEN
        v_bad_target := v_bad_target || (v_key || '→' || v_target);
      END IF;
    END LOOP;

    IF COALESCE(array_length(v_missing, 1), 0) > 0 THEN
      RAISE EXCEPTION 'ph_wf: publish blocked — removed statuses need a remap: %',
        array_to_string(v_missing, ', ') USING ERRCODE = 'P0001';
    END IF;
    IF COALESCE(array_length(v_bad_target, 1), 0) > 0 THEN
      RAISE EXCEPTION 'ph_wf: publish blocked — remap targets missing from draft: %',
        array_to_string(v_bad_target, ', ') USING ERRCODE = 'P0001';
    END IF;

    -- Persist accepted remaps (idempotent per (to_version, entity, old_key)).
    FOREACH v_key IN ARRAY COALESCE(v_removed, '{}')
    LOOP
      INSERT INTO public.ph_wf_status_remaps
        (from_version_id, to_version_id, entity_key, old_status_key, new_status_key, note)
      VALUES
        (v_old.id, p_version_id, v_draft.entity_key, v_key, p_remaps->>v_key, 'publish remap')
      ON CONFLICT (to_version_id, entity_key, old_status_key)
      DO UPDATE SET new_status_key = EXCLUDED.new_status_key, note = EXCLUDED.note;
    END LOOP;

    UPDATE public.ph_wf_versions SET lifecycle = 'superseded' WHERE id = v_old.id;

    UPDATE public.ph_wf_scheme_entries
    SET version_id = p_version_id
    WHERE entity_key = v_draft.entity_key AND version_id = v_old.id;
    GET DIAGNOSTICS v_schemes = ROW_COUNT;
  END IF;

  UPDATE public.ph_wf_versions
  SET lifecycle = 'published', published_at = now(), published_by = auth.uid()
  WHERE id = p_version_id;

  SELECT COUNT(*) INTO v_added
  FROM public.ph_wf_version_statuses n
  WHERE n.version_id = p_version_id
    AND (v_old.id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.ph_wf_version_statuses o
      WHERE o.version_id = v_old.id AND o.status_key = n.status_key));

  PERFORM public.ph_wf_admin_log('version_published', 'version',
    ARRAY[p_version_id] || CASE WHEN v_old.id IS NULL THEN '{}'::uuid[] ELSE ARRAY[v_old.id] END,
    jsonb_build_object(
      'entity_key', v_draft.entity_key,
      'version_no', v_draft.version_no,
      'superseded', v_old.id,
      'statuses_added', v_added,
      'statuses_removed', COALESCE(v_removed, '{}'),
      'remaps', p_remaps,
      'scheme_entries_repointed', v_schemes
    ));

  RETURN jsonb_build_object(
    'ok', true,
    'published_version_id', p_version_id,
    'superseded_version_id', v_old.id,
    'statuses_removed', COALESCE(v_removed, '{}'),
    'scheme_entries_repointed', v_schemes
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- ph_wf_apply_scheme
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_apply_scheme(p_scheme_id uuid, p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ph_wf_assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.ph_wf_schemes WHERE id = p_scheme_id) THEN
    RAISE EXCEPTION 'ph_wf: scheme % not found', p_scheme_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.ph_wf_scheme_assignments (project_id, scheme_id, assigned_by)
  VALUES (p_project_id, p_scheme_id, auth.uid())
  ON CONFLICT (project_id)
  DO UPDATE SET scheme_id = EXCLUDED.scheme_id, assigned_by = EXCLUDED.assigned_by, assigned_at = now();

  PERFORM public.ph_wf_admin_log('scheme_applied', 'scheme', ARRAY[p_scheme_id],
    jsonb_build_object('project_id', p_project_id));
END;
$$;

-- ---------------------------------------------------------------------------
-- ph_wf_reassign_statuses — batched live-item move (ph_issues entities only)
-- Matches on the stored status text (legacy display value) OR the canonical
-- display label, and writes the target's display label + category.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_reassign_statuses(
  p_entity_key  text,
  p_from_status text,
  p_to_status_key text,
  p_project_id  uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_types    text[];
  v_version  uuid;
  v_label    text;
  v_category text;
  v_total    integer := 0;
  v_batch    integer;
BEGIN
  PERFORM public.ph_wf_assert_admin();

  v_types := public.ph_wf_entity_issue_types(p_entity_key);
  IF v_types IS NULL THEN
    RAISE EXCEPTION 'ph_wf: entity % is not ph_issues-backed — use its adapter', p_entity_key
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_version FROM public.ph_wf_versions
  WHERE entity_key = p_entity_key AND lifecycle = 'published'
  ORDER BY version_no DESC LIMIT 1;

  SELECT display_label,
         CASE category WHEN 'todo' THEN 'To Do'
                       WHEN 'in_progress' THEN 'In Progress'
                       ELSE 'Done' END
  INTO v_label, v_category
  FROM public.ph_wf_version_statuses
  WHERE version_id = v_version AND status_key = p_to_status_key;
  IF v_label IS NULL THEN
    RAISE EXCEPTION 'ph_wf: target status % not in published % version', p_to_status_key, p_entity_key
      USING ERRCODE = 'P0002';
  END IF;

  LOOP
    WITH batch AS (
      SELECT i.id FROM public.ph_issues i
      WHERE i.issue_type = ANY(v_types)
        AND lower(i.status) = lower(p_from_status)
        AND (p_project_id IS NULL OR i.project_id = p_project_id)
      LIMIT 5000
    )
    UPDATE public.ph_issues i
    SET status = v_label, status_category = v_category
    FROM batch WHERE i.id = batch.id;
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_total := v_total + v_batch;
    EXIT WHEN v_batch < 5000;
  END LOOP;

  PERFORM public.ph_wf_admin_log('statuses_reassigned', 'entity', NULL,
    jsonb_build_object('entity_key', p_entity_key, 'from', p_from_status,
                       'to_status_key', p_to_status_key, 'project_id', p_project_id,
                       'items_moved', v_total));
  RETURN v_total;
END;
$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'ph_wf_publish_version(uuid, jsonb)',
    'ph_wf_apply_scheme(uuid, uuid)',
    'ph_wf_reassign_statuses(text, text, text, uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated;', fn);
  END LOOP;
END $$;
