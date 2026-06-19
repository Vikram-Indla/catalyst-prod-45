-- Phase B follow-up (Filters refactor, gap G4 completion)
-- An editor (editors_config.specific) could WRITE a private filter (20260619000000)
-- but could NOT SELECT it — you cannot load what you're allowed to edit.
-- Master prompt §3.9: editors read + write. Add the editor branch to the SELECT policy.
-- Reuses ph_saved_filter_can_edit() from the prior migration. Non-destructive (widens read
-- to named editors only — the same set already granted write).

DROP POLICY IF EXISTS ph_saved_filters_select ON public.ph_saved_filters;
CREATE POLICY ph_saved_filters_select ON public.ph_saved_filters
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR owner_id = auth.uid()
    OR (viewers_config ->> 'type') = ANY (ARRAY['everyone','org','organization','global','loggedin','authenticated'])
    OR ((viewers_config ->> 'type') = 'project'  AND ph_saved_filter_is_project_member(project_key, auth.uid()))
    OR ((viewers_config ->> 'type') = 'product'  AND ph_saved_filter_is_product_member(product_key, auth.uid()))
    OR ((viewers_config ->> 'type') = 'specific' AND (viewers_config -> 'user_ids') ? (auth.uid())::text)
    OR public.ph_saved_filter_can_edit(id, auth.uid())
  );
