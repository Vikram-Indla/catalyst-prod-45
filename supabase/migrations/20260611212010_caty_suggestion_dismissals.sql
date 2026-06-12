-- Per-user dismissal log for Caty suggestions (the rolling nudges in the chat
-- dock directory). Suggestions are derived client-side from the user's stale
-- active work items; this table only records which ones the user dismissed.
CREATE TABLE IF NOT EXISTS public.caty_suggestion_dismissals (
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_key text        NOT NULL,
  dismissed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, suggestion_key)
);

ALTER TABLE public.caty_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

-- Owner-only: a user reads/writes only their own dismissals. No self-reference,
-- no membership join -> no recursion risk.
CREATE POLICY caty_dismissals_select ON public.caty_suggestion_dismissals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY caty_dismissals_insert ON public.caty_suggestion_dismissals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY caty_dismissals_delete ON public.caty_suggestion_dismissals
  FOR DELETE TO authenticated USING (user_id = auth.uid());
