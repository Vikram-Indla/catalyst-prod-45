-- P0-17: Add project_key column to ph_saved_filters for cross-project filter isolation.
-- Without this column, useFiltersForProject returned ALL filters regardless of project.

ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS project_key text;

CREATE INDEX IF NOT EXISTS ph_saved_filters_project_key_idx
  ON public.ph_saved_filters (project_key);

COMMENT ON COLUMN public.ph_saved_filters.project_key IS
  'Jira project key (e.g. BAU) scoping this filter to a specific project hub. NULL = global/product-hub filter.';
