-- Shared secret the 06:00 Riyadh pre-warm cron presents to the
-- ai-theme-prewarm edge function. Single-row, RLS-locked: no policies, so
-- only the service_role (which bypasses RLS) can read it — never exposed to
-- clients. The secret VALUE is seeded at deploy time in-DB and is NOT stored
-- in git:
--
--   insert into public.ai_theme_prewarm_config (id, secret)
--   values (true, encode(gen_random_bytes(32), 'hex'))
--   on conflict (id) do nothing;
--
-- Both sides read the same value: the cron reads it from this table at
-- runtime to build the Authorization header; the prewarm function reads it
-- via its service-role client to validate the bearer.

create table if not exists public.ai_theme_prewarm_config (
  id     boolean primary key default true,
  secret text not null,
  constraint ai_theme_prewarm_config_single_row check (id)
);

alter table public.ai_theme_prewarm_config enable row level security;
