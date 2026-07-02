-- CAT-WORKFLOW-STUDIO-20260702-001 / P4 — AI workflow generation cache + import
--
-- ai-generate-workflow (edge fn, service role) writes validated generations
-- here; ph_wf_import_generated materialises one as a DRAFT version. The AI
-- path can only ever produce drafts — publish stays a human action.

CREATE TABLE IF NOT EXISTS public.workflow_generation_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash text NOT NULL UNIQUE,
  entity_key  text,
  model       text NOT NULL,
  request     jsonb NOT NULL,
  response    jsonb NOT NULL,
  hit_count   integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
ALTER TABLE public.workflow_generation_cache ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_generation_cache' AND policyname = 'wf_gen_cache_admin_read') THEN
    CREATE POLICY wf_gen_cache_admin_read ON public.workflow_generation_cache
      FOR SELECT TO authenticated USING (public.ph_wf_is_admin());
  END IF;
END $$;

-- Materialise a cached generation as a draft version for its entity.
CREATE OR REPLACE FUNCTION public.ph_wf_import_generated(p_cache_id uuid, p_entity_key text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row     public.workflow_generation_cache%ROWTYPE;
  v_entity  text;
  v_draft   uuid;
  v_status  jsonb;
  v_tr      jsonb;
BEGIN
  PERFORM public.ph_wf_assert_admin();

  SELECT * INTO v_row FROM public.workflow_generation_cache WHERE id = p_cache_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'ph_wf: generation % not found', p_cache_id USING ERRCODE = 'P0002';
  END IF;

  v_entity := COALESCE(p_entity_key, v_row.entity_key);
  IF v_entity IS NULL THEN
    RAISE EXCEPTION 'ph_wf: entity_key required' USING ERRCODE = '22004';
  END IF;

  -- Blank draft (idempotent per entity: returns the open draft if one exists).
  v_draft := public.ph_wf_create_draft(v_entity, NULL);

  -- Only fill EMPTY drafts — never silently overwrite a human's in-progress draft.
  IF EXISTS (SELECT 1 FROM public.ph_wf_version_statuses WHERE version_id = v_draft) THEN
    RAISE EXCEPTION 'ph_wf: an open draft with content already exists for % — publish or discard it first', v_entity
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_status IN SELECT * FROM jsonb_array_elements(v_row.response->'statuses')
  LOOP
    PERFORM public.ph_wf_upsert_draft_status(v_draft, v_status);
  END LOOP;

  FOR v_tr IN SELECT * FROM jsonb_array_elements(v_row.response->'transitions')
  LOOP
    PERFORM public.ph_wf_upsert_draft_transition(v_draft, v_tr);
  END LOOP;

  UPDATE public.workflow_generation_cache
  SET hit_count = hit_count + 1
  WHERE id = p_cache_id;

  PERFORM public.ph_wf_admin_log('draft_generated_by_ai', 'version', ARRAY[v_draft],
    jsonb_build_object('cache_id', p_cache_id, 'entity_key', v_entity,
                       'name', v_row.response->>'name', 'model', v_row.model));
  RETURN v_draft;
END;
$$;
REVOKE ALL ON FUNCTION public.ph_wf_import_generated(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.ph_wf_import_generated(uuid, text) TO authenticated;
