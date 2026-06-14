-- Standup summary capture. One row per Start→End standup session on the
-- new Kanban board (/project-hub/:key/kanban).
-- Driver = whoever ran the standup from their machine. Captures only the
-- driver's own card movements + comments in the window (denormalised, lean).
-- Applied to lmqwtldpfacrrlvdnmld via apply_migration MCP 2026-06-14.
CREATE TABLE IF NOT EXISTS public.standup_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key    text NOT NULL,
  driver_id      uuid NOT NULL,
  driver_name    text,
  driver_avatar_url text,
  started_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  duration_sec   integer,
  timer_set_sec  integer,
  is_valid       boolean NOT NULL DEFAULT false,   -- duration >= 300s (5-min gate)
  summary_text   text,                              -- lazy: generated on first view
  changes_json   jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{key,type,action,field,from,to,ts}]
  comments_json  jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{key,snippet,ts}]
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standup_sessions_project_started
  ON public.standup_sessions (project_key, started_at DESC);

ALTER TABLE public.standup_sessions ENABLE ROW LEVEL SECURITY;

-- Standup summaries are team-visible (who drove standup is non-private).
-- App-layer gate is the authenticated session; table-layer blocks anon.
CREATE POLICY standup_sessions_select_all ON public.standup_sessions
  FOR SELECT TO authenticated USING (true);

-- Only the driver can create/update their own session (PostgREST INSERT+RETURNING safe).
CREATE POLICY standup_sessions_insert_own ON public.standup_sessions
  FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());

CREATE POLICY standup_sessions_update_own ON public.standup_sessions
  FOR UPDATE TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
