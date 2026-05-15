-- Stub: catalyst_status_history was a pre-existing table in Lovable with no CREATE migration.
CREATE TABLE IF NOT EXISTS public.catalyst_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID,
  issue_key TEXT,
  from_status TEXT,
  to_status TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalyst_status_history_issue_key ON public.catalyst_status_history (issue_key);
CREATE INDEX IF NOT EXISTS idx_catalyst_status_history_changed_at ON public.catalyst_status_history (changed_at DESC);

ALTER TABLE public.catalyst_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalyst_status_history_read" ON public.catalyst_status_history;
CREATE POLICY "catalyst_status_history_read" ON public.catalyst_status_history
  FOR SELECT TO authenticated USING (true);
