-- ai_summary_feedback
--
-- Per-user 👍 / 👎 feedback on AI-generated summaries (currently only
-- the inline "Comments summary" card; can be reused for other summary
-- surfaces). One vote per (issue_key, user_id) — users can change their
-- vote, not stack them.
--
-- RLS pattern follows CLAUDE.md 2026-05-19: write checks use
-- auth.uid() directly; never gates on auth.jwt() ->> 'role' (Catalyst
-- doesn't embed role claims in JWTs).

CREATE TABLE IF NOT EXISTS public.ai_summary_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key    TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote         TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  summary_text TEXT,
  surface      TEXT NOT NULL DEFAULT 'comments_summary',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_key, user_id, surface)
);

CREATE INDEX IF NOT EXISTS ai_summary_feedback_issue_key_idx
  ON public.ai_summary_feedback (issue_key);

CREATE INDEX IF NOT EXISTS ai_summary_feedback_user_id_idx
  ON public.ai_summary_feedback (user_id);

-- Touch updated_at on update.
CREATE OR REPLACE FUNCTION public.ai_summary_feedback_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_summary_feedback_touch_updated_at_trigger
  ON public.ai_summary_feedback;
CREATE TRIGGER ai_summary_feedback_touch_updated_at_trigger
  BEFORE UPDATE ON public.ai_summary_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_summary_feedback_touch_updated_at();

-- RLS
ALTER TABLE public.ai_summary_feedback ENABLE ROW LEVEL SECURITY;

-- Each user can read their own feedback rows.
CREATE POLICY ai_summary_feedback_select_own
  ON public.ai_summary_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Each user can insert their own feedback (user_id must match the JWT).
CREATE POLICY ai_summary_feedback_insert_own
  ON public.ai_summary_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Each user can update their own feedback (change vote).
CREATE POLICY ai_summary_feedback_update_own
  ON public.ai_summary_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Each user can delete their own feedback (clear vote).
CREATE POLICY ai_summary_feedback_delete_own
  ON public.ai_summary_feedback
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
