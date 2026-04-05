-- Drop legacy notifications table and its policies
DROP TABLE IF EXISTS public.notifications CASCADE;

-- ═══════════════════════════════════════════
-- TABLE: notifications (NotifyHub v2)
-- ═══════════════════════════════════════════
CREATE TABLE public.notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   UUID NOT NULL,
  actor_user_id       UUID,
  notification_type   TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  entity_title        TEXT NOT NULL DEFAULT '',
  entity_key          TEXT NOT NULL DEFAULT '',
  entity_icon_type    TEXT NOT NULL DEFAULT 'task',
  hub_source          TEXT NOT NULL DEFAULT 'ProjectHub',
  status              TEXT NOT NULL DEFAULT 'To Do',
  status_type         TEXT NOT NULL DEFAULT 'gray' CHECK (status_type IN ('gray','blue','green')),
  tab                 TEXT NOT NULL DEFAULT 'direct' CHECK (tab IN ('direct','watching','ai')),
  metadata            JSONB NOT NULL DEFAULT '{}',
  read_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ DEFAULT now(),
  snoozed_until       TIMESTAMPTZ,
  entity_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for idempotency (expression-based)
CREATE UNIQUE INDEX uq_notification_idempotency
  ON public.notifications (actor_user_id, recipient_user_id, entity_id, notification_type, (DATE(created_at AT TIME ZONE 'Asia/Riyadh')));

CREATE INDEX idx_notif_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX idx_notif_unread
  ON public.notifications (recipient_user_id)
  WHERE read_at IS NULL;

CREATE INDEX idx_notif_tab
  ON public.notifications (recipient_user_id, tab, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Service role inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_user_id)
  WITH CHECK (auth.uid() = recipient_user_id);

-- ═══════════════════════════════════════════
-- TABLE: notification_preferences
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  notification_type TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  toast_enabled     BOOLEAN NOT NULL DEFAULT true,
  show_unread_only  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notif_pref UNIQUE (user_id, notification_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- TRIGGER: update updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notifications_updated_at();

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_notifications_updated_at();

-- ═══════════════════════════════════════════
-- VIEW: unread count per user
-- ═══════════════════════════════════════════
CREATE OR REPLACE VIEW public.notification_unread_counts AS
SELECT
  recipient_user_id,
  COUNT(*) FILTER (WHERE tab = 'direct')   AS direct_unread,
  COUNT(*) FILTER (WHERE tab = 'watching') AS watching_unread,
  COUNT(*)                                  AS total_unread
FROM public.notifications
WHERE read_at IS NULL
  AND (snoozed_until IS NULL OR snoozed_until < now())
  AND entity_deleted = false
GROUP BY recipient_user_id;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;