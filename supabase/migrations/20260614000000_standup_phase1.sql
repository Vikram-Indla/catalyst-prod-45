-- Standup Phase 1 — capture sessions, per-speaker turns, and status changes.
-- AI summarisation (notes → ai_explanation, session → summary_md) is layered
-- on later phases; this migration only stands up the empty bones.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. standups — one row per started standup, set ended_at when the user
--    ends it. summary_md + summary_status are populated in Phase 3.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.standups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key     text NOT NULL,
  board_id        uuid,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  started_by      uuid REFERENCES public.profiles(id),
  summary_md      text,
  summary_status  text NOT NULL DEFAULT 'pending'
                  CHECK (summary_status IN ('pending','generating','ready','failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS standups_project_key_started_at_idx
  ON public.standups (project_key, started_at DESC);

CREATE INDEX IF NOT EXISTS standups_board_id_idx
  ON public.standups (board_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. standup_events — one row per speaker's turn during a standup. Phase 2
--    will populate `notes` with the dictated transcript.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.standup_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standup_id    uuid NOT NULL REFERENCES public.standups(id) ON DELETE CASCADE,
  speaker_name  text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS standup_events_standup_id_started_at_idx
  ON public.standup_events (standup_id, started_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. standup_status_changes — one row per ticket move executed during a
--    standup, attributed to whoever was speaking. ai_explanation is
--    populated in Phase 3.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.standup_status_changes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standup_id      uuid NOT NULL REFERENCES public.standups(id) ON DELETE CASCADE,
  event_id        uuid REFERENCES public.standup_events(id) ON DELETE SET NULL,
  speaker_name    text NOT NULL,
  issue_id        uuid NOT NULL,
  issue_key       text NOT NULL,
  from_status     text,
  to_status       text NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  ai_explanation  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS standup_status_changes_standup_id_idx
  ON public.standup_status_changes (standup_id);

CREATE INDEX IF NOT EXISTS standup_status_changes_issue_id_idx
  ON public.standup_status_changes (issue_id);

CREATE INDEX IF NOT EXISTS standup_status_changes_issue_key_idx
  ON public.standup_status_changes (issue_key);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger on standups (started_by user closes the standup,
--    summary later marks summary_status — keep updated_at honest).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_standups()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS standups_set_updated_at ON public.standups;
CREATE TRIGGER standups_set_updated_at
  BEFORE UPDATE ON public.standups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_standups();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS — Phase 1 is permissive: any authenticated user can read every
--    standup; only the user who started a standup can write to it (or to
--    its child rows). Tighter project-membership gating can land in a
--    follow-up migration without breaking existing rows.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.standups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_status_changes ENABLE ROW LEVEL SECURITY;

-- standups
DROP POLICY IF EXISTS "standups_select_authenticated" ON public.standups;
CREATE POLICY "standups_select_authenticated" ON public.standups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "standups_insert_own" ON public.standups;
CREATE POLICY "standups_insert_own" ON public.standups
  FOR INSERT TO authenticated
  WITH CHECK (started_by = auth.uid());

DROP POLICY IF EXISTS "standups_update_own" ON public.standups;
CREATE POLICY "standups_update_own" ON public.standups
  FOR UPDATE TO authenticated
  USING (started_by = auth.uid())
  WITH CHECK (started_by = auth.uid());

-- standup_events — gated by ownership of the parent standup
DROP POLICY IF EXISTS "standup_events_select_authenticated" ON public.standup_events;
CREATE POLICY "standup_events_select_authenticated" ON public.standup_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "standup_events_insert_via_own_standup" ON public.standup_events;
CREATE POLICY "standup_events_insert_via_own_standup" ON public.standup_events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.standups s WHERE s.id = standup_id AND s.started_by = auth.uid())
  );

DROP POLICY IF EXISTS "standup_events_update_via_own_standup" ON public.standup_events;
CREATE POLICY "standup_events_update_via_own_standup" ON public.standup_events
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.standups s WHERE s.id = standup_id AND s.started_by = auth.uid())
  );

-- standup_status_changes — gated by ownership of the parent standup
DROP POLICY IF EXISTS "standup_status_changes_select_authenticated" ON public.standup_status_changes;
CREATE POLICY "standup_status_changes_select_authenticated" ON public.standup_status_changes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "standup_status_changes_insert_via_own_standup" ON public.standup_status_changes;
CREATE POLICY "standup_status_changes_insert_via_own_standup" ON public.standup_status_changes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.standups s WHERE s.id = standup_id AND s.started_by = auth.uid())
  );

COMMIT;
