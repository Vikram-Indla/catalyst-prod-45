-- Sprint AI-summary cache (team-shared, hashed by structural sprint state).
-- Stores the AI-generated summary text for a sprint, keyed on a hash of the
-- sprint row + its sprint_id-FK-linked work items. Lets the client skip the
-- summarize-release edge-function call entirely when the sprint has not
-- structurally changed since the last summary was generated.
--
-- Unlike board_insight_cache (per-user — a board's visible content varies by
-- viewer), a sprint's AI summary is deterministic for a given data_hash
-- regardless of who requests it, so this table has no user_id column: one
-- teammate's request caches the result for everyone viewing that sprint
-- (CAT-SPRINTS-NATIVE-20260702-002 Phase 3 Slice 3, D-022).

CREATE TABLE IF NOT EXISTS public.sprint_insight_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id     uuid NOT NULL REFERENCES public.ph_jira_sprints(id) ON DELETE CASCADE,
  data_hash     text NOT NULL,        -- hash of the structural sprint state
  summary_text  text NOT NULL,        -- the streamed AI summary, verbatim
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, data_hash)
);

CREATE INDEX IF NOT EXISTS sprint_insight_cache_lookup_idx
  ON public.sprint_insight_cache (sprint_id, data_hash);

ALTER TABLE public.sprint_insight_cache ENABLE ROW LEVEL SECURITY;

-- Team-shared, not owner-scoped: any authenticated user may read a cache hit
-- or write a fresh summary. No DELETE policy — stale hashes are superseded
-- by new rows, not pruned, at this data volume.
CREATE POLICY sprint_insight_cache_select_authenticated ON public.sprint_insight_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY sprint_insight_cache_insert_authenticated ON public.sprint_insight_cache
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY sprint_insight_cache_update_authenticated ON public.sprint_insight_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
