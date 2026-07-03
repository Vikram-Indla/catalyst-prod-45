-- CAT-WORKFLOW-STUDIO-20260702-001 / F1 — custom types become engine entities
--
-- A custom work item type had no entity_key, so it could never own a
-- ph_wf_* workflow (create_draft/generate/gateTransition all key on
-- entity_key). From now on a custom type's entity_key defaults to its
-- type_key, giving every custom type its own workflow namespace.
-- Backfill existing live custom rows the same way.

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
      -- F1: custom types own a workflow namespace = their type_key.
      COALESCE(NULLIF(p_type->>'entity_key',''), p_type->>'type_key'),
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
    UPDATE public.ph_work_item_types SET
      display_name           = CASE WHEN is_system THEN display_name ELSE COALESCE(p_type->>'display_name', display_name) END,
      description            = COALESCE(p_type->>'description', description),
      icon                   = COALESCE(p_type->>'icon', icon),
      color_token            = COALESCE(p_type->>'color_token', color_token),
      kind                   = CASE WHEN is_system THEN kind ELSE COALESCE(p_type->>'kind', kind) END,
      group_key              = COALESCE(p_type->>'group_key', group_key),
      hierarchy_level_id     = COALESCE(NULLIF(p_type->>'hierarchy_level_id','')::uuid, hierarchy_level_id),
      entity_key             = COALESCE(NULLIF(p_type->>'entity_key',''), entity_key,
                                        CASE WHEN NOT is_system THEN type_key END),
      default_wf_template_id = COALESCE(NULLIF(p_type->>'default_wf_template_id','')::uuid, default_wf_template_id),
      is_enabled             = COALESCE((p_type->>'is_enabled')::boolean, is_enabled),
      sort_order             = COALESCE((p_type->>'sort_order')::integer, sort_order)
    WHERE id = v_id;
  END IF;

  PERFORM public.ph_wf_admin_log('work_item_type_upserted', 'work_item_type', ARRAY[v_id], p_type);
  RETURN v_id;
END;
$$;

-- Backfill live custom rows.
UPDATE public.ph_work_item_types
SET entity_key = type_key
WHERE is_system = false AND archived_at IS NULL AND entity_key IS NULL;
