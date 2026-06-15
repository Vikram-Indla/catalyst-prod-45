-- Board health insight cache (per-user, hashed by structural board state).
-- Stores the AI-generated portion of a Board health insight (summary + per-column
-- actions) keyed on a hash of the user's open-item set. Lets the client skip the
-- ai-digest call entirely when the board has not structurally changed.
--
-- The hash is computed client-side over (issue_key, status, jira_updated_at) for
-- the open items — NOT over time-derived "days since update" — so a row stays
-- valid across days and only busts when the board actually changes.

CREATE TABLE IF NOT EXISTS public.board_insight_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_scope text NOT NULL,        -- specific project key, or 'all'
  data_hash     text NOT NULL,        -- hash of the structural board state
  insight       jsonb NOT NULL,       -- { summary, columns: [{ column, action }] }
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_scope, data_hash)
);

CREATE INDEX IF NOT EXISTS board_insight_cache_lookup_idx
  ON public.board_insight_cache (user_id, project_scope, data_hash);

ALTER TABLE public.board_insight_cache ENABLE ROW LEVEL SECURITY;

-- Owner-only access. Catalyst roles live in user_roles, never in the JWT; the
-- canonical per-user gate is user_id = auth.uid().
CREATE POLICY board_insight_cache_select_own ON public.board_insight_cache
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY board_insight_cache_insert_own ON public.board_insight_cache
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY board_insight_cache_update_own ON public.board_insight_cache
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY board_insight_cache_delete_own ON public.board_insight_cache
  FOR DELETE TO authenticated USING (user_id = auth.uid());
