-- Standup Phase 1 follow-up — optional per-speaker timer reading.
--
-- Adds standup_events.timer_seconds (nullable integer). Captures how
-- many seconds the standup timer counted during this speaker's turn.
--
-- Null is the explicit "timer wasn't used" signal — consumers fall back
-- to wall-clock (ended_at - started_at) when null. Making the column
-- nullable means turning the timer off (or never turning it on) cannot
-- break standup logging.
--
-- Constraint: timer_seconds must be >= 0 when set; UI emits whole
-- seconds, so integer is the right unit.

BEGIN;

ALTER TABLE public.standup_events
  ADD COLUMN IF NOT EXISTS timer_seconds integer
  CHECK (timer_seconds IS NULL OR timer_seconds >= 0);

COMMENT ON COLUMN public.standup_events.timer_seconds IS
  'Seconds the standup timer counted during this speaker''s turn. Null when the timer was disabled — consumers should fall back to (ended_at - started_at) wall-clock for duration in that case.';

COMMIT;
