-- Jira filter directory sync (jira-compare filters parity, 2026-06-10)
-- Adds Jira-source columns to ph_saved_filters so the Filters directory can
-- list real Jira filters with their exact share/edit permission structures.
ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS jira_filter_id text,
  ADD COLUMN IF NOT EXISTS jira_owner_name text,
  ADD COLUMN IF NOT EXISTS jira_owner_account_id text,
  ADD COLUMN IF NOT EXISTS share_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS edit_permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ph_saved_filters_jira_filter_id_key
  ON public.ph_saved_filters (jira_filter_id);
