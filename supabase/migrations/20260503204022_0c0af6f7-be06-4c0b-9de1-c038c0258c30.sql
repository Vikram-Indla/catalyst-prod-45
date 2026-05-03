
INSERT INTO storage.buckets (id, name, public)
VALUES ('jira-attachments', 'jira-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ph_issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  jira_attachment_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  is_image BOOLEAN DEFAULT false,
  storage_path TEXT,
  storage_url TEXT,
  jira_author TEXT,
  jira_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_key, jira_attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_ph_issue_attachments_issue ON public.ph_issue_attachments(issue_key);

ALTER TABLE public.ph_issue_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_jira_attachments"
ON public.ph_issue_attachments FOR SELECT TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.jira_bau_reload_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  since_timestamp TIMESTAMPTZ,
  issues_processed INT DEFAULT 0,
  issues_upserted INT DEFAULT 0,
  attachments_uploaded INT DEFAULT 0,
  attachments_skipped_video INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'running'
);

ALTER TABLE public.jira_bau_reload_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_reload_runs"
ON public.jira_bau_reload_runs FOR SELECT TO authenticated
USING (true);
