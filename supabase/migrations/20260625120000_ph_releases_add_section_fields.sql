-- ph_releases — add user-defined dynamic section (name + rich-text description).
--
-- Why: release detail view ("Give this section a name" block) was storing the
-- section name in component state only (lost on refresh) and writing the
-- section body into ph_releases.description — the release-level plain
-- description column — clobbering it.
--
-- The dynamic section is separate from the release's own description:
--   - ph_releases.description           → plain release-level description (existing, unchanged)
--   - ph_releases.section_name          → user-typed heading for the dynamic block
--   - ph_releases.section_description_adf → ADF JSON body of that dynamic block

ALTER TABLE public.ph_releases
  ADD COLUMN IF NOT EXISTS section_name text NULL,
  ADD COLUMN IF NOT EXISTS section_description_adf jsonb NULL;

COMMENT ON COLUMN public.ph_releases.section_name
  IS 'User-defined heading for the dynamic section on the release detail view. Nullable.';
COMMENT ON COLUMN public.ph_releases.section_description_adf
  IS 'Atlassian Document Format (ADF) JSON body for the dynamic section. Nullable.';
