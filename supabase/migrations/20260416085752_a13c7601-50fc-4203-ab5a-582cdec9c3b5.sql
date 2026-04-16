
-- Jira Sync Activity monitoring table
CREATE TABLE public.jira_sync_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  work_item_id UUID,
  work_item_key TEXT NOT NULL,
  work_item_type TEXT,
  work_item_title TEXT,
  change_type TEXT NOT NULL,
  change_summary TEXT,
  changed_fields JSONB DEFAULT '{}',
  catalyst_changed_at TIMESTAMPTZ,
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'failed', 'skipped')),
  sync_source TEXT DEFAULT 'realtime' CHECK (sync_source IN ('realtime', 'scheduled')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  conflict_detected BOOLEAN NOT NULL DEFAULT false,
  conflict_resolution TEXT,
  project_key TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_jsa_created_at ON public.jira_sync_activity (created_at DESC);
CREATE INDEX idx_jsa_direction ON public.jira_sync_activity (direction);
CREATE INDEX idx_jsa_sync_status ON public.jira_sync_activity (sync_status);
CREATE INDEX idx_jsa_project_key ON public.jira_sync_activity (project_key);
CREATE INDEX idx_jsa_work_item_key ON public.jira_sync_activity (work_item_key);

-- Enable RLS
ALTER TABLE public.jira_sync_activity ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (admin monitoring)
CREATE POLICY "Authenticated users can view sync activity"
  ON public.jira_sync_activity
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role only for writes (edge functions / triggers)
CREATE POLICY "Service role can manage sync activity"
  ON public.jira_sync_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-purge function: delete records older than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_sync_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.jira_sync_activity
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;
