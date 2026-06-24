-- Per-project Jira field -> ph_issues column remap.
-- Each row: for `project_key`, read Jira field `jira_field` and write it to ph_issues.`target_column`
-- during sync transform (wh-jira-sync), overriding the engine's default source for that column.
-- target_column is constrained to real, remappable ph_issues columns.

CREATE TABLE IF NOT EXISTS public.jira_project_field_mappings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment   text NOT NULL CHECK (environment IN ('staging','production','local')),
  project_key   text NOT NULL,
  target_column text NOT NULL CHECK (target_column IN
    ('priority','assignee_account_id','parent_key','due_date','status','labels','fix_versions','components')),
  -- Jira field id/name to read from (e.g. 'priority', 'customfield_10125', 'duedate').
  jira_field    text NOT NULL,
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, project_key, target_column)
);

ALTER TABLE public.jira_project_field_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jira_field_maps_select ON public.jira_project_field_mappings;
CREATE POLICY jira_field_maps_select ON public.jira_project_field_mappings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS jira_field_maps_write ON public.jira_project_field_mappings;
CREATE POLICY jira_field_maps_write ON public.jira_project_field_mappings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));
