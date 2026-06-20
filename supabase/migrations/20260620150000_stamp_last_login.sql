-- Stamp profiles.last_login_at on every successful sign-in.
-- SECURITY DEFINER so it works regardless of the profiles RLS update policy;
-- it only ever touches the caller's own row (auth.uid()).
create or replace function public.stamp_last_login()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_login_at = now()
   where id = auth.uid();
$$;

grant execute on function public.stamp_last_login() to authenticated;
