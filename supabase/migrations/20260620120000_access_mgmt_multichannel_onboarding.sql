-- Access Management rewrite — Phase 1 (additive, no new core tables).
-- Repurpose user_invitations as the single onboarding artifact for invite/reset/unlock,
-- across delivery channels (manual/email/whatsapp/sms), with admin-selectable TTL.
-- Reuses existing tables (user_invitations, profiles, email_log) — extend only.

-- ── user_invitations: artifact extensions ──────────────────────────────────
alter table public.user_invitations
  add column if not exists delivery_channel text not null default 'email',
  add column if not exists phone            text,
  add column if not exists purpose          text not null default 'invite',
  add column if not exists revoked_at       timestamptz,
  add column if not exists full_name        text,
  add column if not exists ttl_seconds      integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_invitations_delivery_channel_chk') then
    alter table public.user_invitations
      add constraint user_invitations_delivery_channel_chk
      check (delivery_channel in ('manual','email','whatsapp','sms'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_invitations_purpose_chk') then
    alter table public.user_invitations
      add constraint user_invitations_purpose_chk
      check (purpose in ('invite','reset','unlock'));
  end if;
end $$;

-- ── profiles: contact channel + lifecycle timestamps ───────────────────────
alter table public.profiles
  add column if not exists phone             text,
  add column if not exists preferred_channel text not null default 'email',
  add column if not exists suspended_at      timestamptz,
  add column if not exists deactivated_at    timestamptz;

-- ── email_log → unified delivery log across channels ───────────────────────
alter table public.email_log
  add column if not exists channel   text not null default 'email',
  add column if not exists recipient text;
