-- Huddle participant heartbeat.
--
-- Problem: when a participant drops uncleanly (tab close, network loss, crash)
-- the `leave()` path never runs, so `left_at` stays NULL and the huddle reads
-- as 'active' with stale "live" participants forever — producing a phantom
-- "Rejoin huddle" strip that never clears even after BOTH sides drop.
--
-- Fix: each in-call client bumps its participant row every ~5s. A row whose
-- last_seen_at is older than the client staleness window (~25s) is treated as
-- gone by the UI, so a fully-dropped huddle stops showing Rejoin within ~25s.
-- The BEFORE UPDATE trigger stamps last_seen_at with the SERVER clock (now())
-- so the value is independent of client clock skew on the write side.

ALTER TABLE public.chat_huddle_participants
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_huddle_participant_seen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_huddle_participant_seen ON public.chat_huddle_participants;
CREATE TRIGGER trg_touch_huddle_participant_seen
  BEFORE UPDATE ON public.chat_huddle_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_huddle_participant_seen();

NOTIFY pgrst, 'reload schema';
