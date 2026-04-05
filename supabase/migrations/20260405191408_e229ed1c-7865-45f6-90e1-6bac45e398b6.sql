ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_dismissed
  ON public.notifications (recipient_user_id, is_dismissed)
  WHERE is_dismissed = FALSE;