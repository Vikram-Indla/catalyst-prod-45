
-- Table to store Jira attachment metadata extracted during sync
CREATE TABLE public.ph_issue_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_key TEXT NOT NULL,
  jira_attachment_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  content_url TEXT NOT NULL,
  author_display_name TEXT,
  author_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jira_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Local storage path (when downloaded to Catalyst storage)
  local_storage_path TEXT,
  local_public_url TEXT,
  UNIQUE(issue_key, jira_attachment_id)
);

-- Index for fast lookup by issue_key
CREATE INDEX idx_ph_issue_attachments_issue_key ON public.ph_issue_attachments(issue_key);

-- Enable RLS
ALTER TABLE public.ph_issue_attachments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read attachments
CREATE POLICY "Authenticated users can read attachments"
  ON public.ph_issue_attachments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can insert/update (sync function uses service role)
CREATE POLICY "Service role can manage attachments"
  ON public.ph_issue_attachments
  FOR ALL
  USING (true)
  WITH CHECK (true);
