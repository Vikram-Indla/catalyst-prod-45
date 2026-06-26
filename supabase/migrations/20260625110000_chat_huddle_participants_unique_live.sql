-- Prevent duplicate LIVE participant rows for the same user in one huddle
-- (double-click / rapid re-join). Also the cheap durable guard behind the
-- app-side cap-2 check, which is a non-atomic check-then-insert.
CREATE UNIQUE INDEX IF NOT EXISTS chat_huddle_participants_one_live_per_user
  ON public.chat_huddle_participants (huddle_id, user_id)
  WHERE left_at IS NULL;
