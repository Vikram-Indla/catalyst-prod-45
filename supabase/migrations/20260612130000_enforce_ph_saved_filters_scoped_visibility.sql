-- Enforce scoped visibility on ph_saved_filters (Vikram-approved 2026-06-12).
--
-- Before: RLS was binary — `user_id = auth.uid() OR is_shared = true OR owner_id = auth.uid()`.
-- viewers_config.type ('private'|'org'|'specific') and hub_scope were COSMETIC: any
-- is_shared=true row was visible to every authenticated user. "Organisation" meant nothing.
--
-- After: viewers_config.type drives real enforcement —
--   private   -> owner/creator only
--   project   -> members of project_key (ph_project_members)
--   product   -> members of product_key (product_members)
--   specific  -> users listed in viewers_config.user_ids
--   everyone  -> all authenticated (= the old is_shared=true behaviour)
--
-- Backfill keys off is_shared so CURRENT visibility is preserved exactly (zero regression):
-- the 127 shared rows become 'everyone', the 19 private rows become 'private'.

-- 1. Product reference (project_key already exists). Null on project-hub saves.
ALTER TABLE public.ph_saved_filters ADD COLUMN IF NOT EXISTS product_key text;

-- 2. Backfill viewers_config from the only bit that was ever enforced.
UPDATE public.ph_saved_filters
  SET viewers_config = jsonb_build_object('type', 'everyone')
  WHERE is_shared = true;

UPDATE public.ph_saved_filters
  SET viewers_config = jsonb_build_object('type', 'private')
  WHERE is_shared = false;

-- 3. SECURITY DEFINER membership helpers — no policy self-reference (no recursion),
--    params prefixed p_ to avoid the column/param shadowing bug (CLAUDE.md 2026-06-10).
CREATE OR REPLACE FUNCTION public.ph_saved_filter_is_project_member(p_project_key text, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ph_project_members m
    JOIN public.ph_projects p ON p.id = m.project_id
    WHERE p.key = p_project_key
      AND m.user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.ph_saved_filter_is_product_member(p_product_key text, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.product_members m
    JOIN public.products pr ON pr.id = m.product_id
    WHERE pr.code = p_product_key
      AND m.user_id = p_user
  );
$$;

REVOKE ALL ON FUNCTION public.ph_saved_filter_is_project_member(text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.ph_saved_filter_is_product_member(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.ph_saved_filter_is_project_member(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ph_saved_filter_is_product_member(text, uuid) TO authenticated;

-- 4. Replace the binary SELECT policy with scope enforcement.
DROP POLICY IF EXISTS ph_saved_filters_select ON public.ph_saved_filters;
CREATE POLICY ph_saved_filters_select ON public.ph_saved_filters
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR owner_id = auth.uid()
  -- 'everyone' plus legacy/Jira share vocabularies all mean "all authenticated"
  OR (viewers_config->>'type') IN ('everyone','org','organization','global','loggedin','authenticated')
  OR ((viewers_config->>'type') = 'project'
        AND public.ph_saved_filter_is_project_member(project_key, auth.uid()))
  OR ((viewers_config->>'type') = 'product'
        AND public.ph_saved_filter_is_product_member(product_key, auth.uid()))
  OR ((viewers_config->>'type') = 'specific'
        AND (viewers_config->'user_ids') ? (auth.uid())::text)
);
