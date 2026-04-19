-- 1. UUID assignee/reporter columns
ALTER TABLE ph_issues
  ADD COLUMN assignee_user_id UUID NULL REFERENCES auth.users(id),
  ADD COLUMN reporter_user_id UUID NULL REFERENCES auth.users(id);

CREATE INDEX idx_ph_issues_assignee_user ON ph_issues(assignee_user_id);
CREATE INDEX idx_ph_issues_reporter_user ON ph_issues(reporter_user_id);

-- 2. Backfill via jira_identity_map
UPDATE ph_issues i
  SET assignee_user_id = jim.catalyst_user_id
  FROM jira_identity_map jim
  WHERE jim.jira_account_id = i.assignee_account_id
    AND i.assignee_user_id IS NULL;

UPDATE ph_issues i
  SET reporter_user_id = jim.catalyst_user_id
  FROM jira_identity_map jim
  WHERE jim.jira_account_id = i.reporter_account_id
    AND i.reporter_user_id IS NULL;

-- 3. Archive columns
ALTER TABLE ph_issues
  ADD COLUMN archived_at TIMESTAMPTZ NULL,
  ADD COLUMN archived_by UUID NULL REFERENCES auth.users(id);

CREATE INDEX idx_ph_issues_archived
  ON ph_issues (project_key, archived_at)
  WHERE archived_at IS NOT NULL;

-- 4. Archive RLS (admin/owner only UPDATE on archived_at)
CREATE POLICY "archived_at_update_admin_owner"
  ON ph_issues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ph_project_members pm
      JOIN ph_projects p ON p.id = pm.project_id
      WHERE p.key = ph_issues.project_key
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (true);

-- 5. ph_issue_remote_links
CREATE TABLE public.ph_issue_remote_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.ph_issues(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  title TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ph_issue_remote_links_issue ON ph_issue_remote_links(issue_id);

ALTER TABLE ph_issue_remote_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remote_links_select_members" ON ph_issue_remote_links
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      JOIN ph_project_members pm ON pm.project_id = p.id
      WHERE i.id = ph_issue_remote_links.issue_id AND pm.user_id = auth.uid())
  );

CREATE POLICY "remote_links_insert_members" ON ph_issue_remote_links
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      JOIN ph_project_members pm ON pm.project_id = p.id
      WHERE i.id = ph_issue_remote_links.issue_id AND pm.user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "remote_links_delete_members" ON ph_issue_remote_links
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM ph_issues i
      JOIN ph_projects p ON p.key = i.project_key
      JOIN ph_project_members pm ON pm.project_id = p.id
      WHERE i.id = ph_issue_remote_links.issue_id AND pm.user_id = auth.uid())
  );