-- Engagement lifecycle timestamps for email_log, populated by the Resend
-- webhook (email-webhook edge function). "sent" already exists via sent_at.
alter table public.email_log
  add column if not exists delivered_at  timestamptz,
  add column if not exists opened_at     timestamptz,
  add column if not exists clicked_at    timestamptz,
  add column if not exists bounced_at    timestamptz,
  add column if not exists complained_at timestamptz;

create index if not exists email_log_provider_msg_idx on public.email_log(provider_message_id);
create index if not exists email_log_recipient_idx on public.email_log(to_email);
