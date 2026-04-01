CREATE TABLE IF NOT EXISTS public.ph_project_sync_cursor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key text NOT NULL UNIQUE,
  last_synced_at timestamptz NOT NULL DEFAULT '2026-01-01T00:00:00Z',
  last_issue_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ph_project_sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sync cursors"
ON public.ph_project_sync_cursor
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to sync cursors"
ON public.ph_project_sync_cursor
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);