-- Daily "Re-analyze" budget for the AI Theme Analyzer (3/day/user).
-- One row per user per Riyadh-day (UTC+3, no DST) so the budget resets at
-- the same 06:00 pre-warm boundary for everyone. Authoritative counter;
-- the client (useThemeQuota) reads it to drive the hover "· N left" counter
-- and lock the Re-analyze button at zero. The themes edge handler increments
-- it via increment_theme_quota() after a real user-initiated LLM run.

create table if not exists public.ai_theme_quota (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day_riyadh date not null,
  used       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_riyadh)
);

alter table public.ai_theme_quota enable row level security;

-- Users read only their own quota. No client writes — the edge function
-- increments through the SECURITY DEFINER RPC below.
drop policy if exists ai_theme_quota_select_own on public.ai_theme_quota;
create policy ai_theme_quota_select_own on public.ai_theme_quota
  for select to authenticated
  using (user_id = auth.uid());

-- Atomic increment (bypasses RLS); returns the new used count.
create or replace function public.increment_theme_quota(p_user_id uuid, p_day date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_used int;
begin
  insert into public.ai_theme_quota (user_id, day_riyadh, used, updated_at)
  values (p_user_id, p_day, 1, now())
  on conflict (user_id, day_riyadh)
  do update set used = ai_theme_quota.used + 1, updated_at = now()
  returning used into v_used;
  return v_used;
end;
$$;

revoke all on function public.increment_theme_quota(uuid, date) from public, anon;
grant execute on function public.increment_theme_quota(uuid, date) to authenticated, service_role;
