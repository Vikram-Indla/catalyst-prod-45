CREATE TABLE IF NOT EXISTS public.email_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  to_email            text NOT NULL,
  from_email          text NOT NULL,
  from_name           text NOT NULL,
  subject             text NOT NULL,
  template_name       text NOT NULL,
  template_props      jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_text           text,
  body_html           text,
  provider            text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  status              text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','bounced','complained','failed')),
  error_message       text,
  attempt_count       int NOT NULL DEFAULT 1,
  sent_by_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_log_recipient_sent
  ON public.email_log (recipient_user_id, sent_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_email_log_to_email_sent
  ON public.email_log (to_email, sent_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_email_log_template_sent
  ON public.email_log (template_name, sent_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_email_log_status
  ON public.email_log (status) WHERE status IN ('queued','failed','bounced');

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all email_log" ON public.email_log;
CREATE POLICY "Admins can view all email_log"
  ON public.email_log
  FOR SELECT
  USING (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own email_log" ON public.email_log;
CREATE POLICY "Users can view their own email_log"
  ON public.email_log
  FOR SELECT
  USING (recipient_user_id = auth.uid());