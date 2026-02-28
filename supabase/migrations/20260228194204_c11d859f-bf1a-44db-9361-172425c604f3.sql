
-- Jira sync comments table
CREATE TABLE IF NOT EXISTS public.jira_sync_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_key TEXT NOT NULL,
  jira_comment_id TEXT,
  author_display_name TEXT,
  author_account_id TEXT,
  author_avatar_url TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jira_created_at TIMESTAMPTZ,
  jira_updated_at TIMESTAMPTZ,
  UNIQUE(issue_key, jira_comment_id)
);

-- Jira sync changelog table
CREATE TABLE IF NOT EXISTS public.jira_sync_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_key TEXT NOT NULL,
  jira_history_id TEXT,
  author_display_name TEXT,
  author_account_id TEXT,
  author_avatar_url TEXT,
  field_name TEXT NOT NULL,
  field_type TEXT,
  from_value TEXT,
  to_value TEXT,
  from_string TEXT,
  to_string TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jira_created_at TIMESTAMPTZ
);

-- Jira sync issue links table
CREATE TABLE IF NOT EXISTS public.jira_sync_issue_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_key TEXT NOT NULL,
  target_key TEXT NOT NULL,
  link_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outward',
  target_summary TEXT,
  target_type TEXT,
  target_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jira_link_id TEXT,
  UNIQUE(source_key, target_key, link_type)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_jira_sync_comments_issue_key ON public.jira_sync_comments(issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_sync_changelog_issue_key ON public.jira_sync_changelog(issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_sync_issue_links_source ON public.jira_sync_issue_links(source_key);
CREATE INDEX IF NOT EXISTS idx_jira_sync_issue_links_target ON public.jira_sync_issue_links(target_key);

-- RLS
ALTER TABLE public.jira_sync_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sync_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sync_issue_links ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (Jira data is project-level, not user-specific)
CREATE POLICY "Authenticated users can read jira comments" ON public.jira_sync_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read jira changelog" ON public.jira_sync_changelog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read jira issue links" ON public.jira_sync_issue_links FOR SELECT TO authenticated USING (true);

-- Write access for service role only (synced by edge functions)
CREATE POLICY "Service role can manage jira comments" ON public.jira_sync_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage jira changelog" ON public.jira_sync_changelog FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage jira issue links" ON public.jira_sync_issue_links FOR ALL TO service_role USING (true) WITH CHECK (true);
