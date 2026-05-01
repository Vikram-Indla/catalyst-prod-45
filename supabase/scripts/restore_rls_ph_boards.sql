-- Re-enable RLS on ph_boards (we disabled it for a diagnostic earlier).
-- The permissive SELECT/INSERT/UPDATE/DELETE policies for authenticated
-- role are still in place; just need to flip the table flag back on.
alter table public.ph_boards enable row level security;

-- Verify
select
  c.relname,
  c.relrowsecurity   as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
where c.relname = 'ph_boards' and c.relnamespace::regnamespace::text = 'public';
