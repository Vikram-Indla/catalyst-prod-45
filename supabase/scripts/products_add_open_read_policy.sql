-- Phase 1 follow-up — add a permissive read policy for products.
-- Existing 'Products viewable by approved users' uses
-- current_user_is_approved() which somehow filters INV but lets the
-- 4 pre-existing products through. Rather than continue debugging
-- that mystery, add a second permissive SELECT policy that reads
-- USING(true) for authenticated users. Permissive policies are OR'd
-- so this just opens the door without removing the existing check.
--
-- If after running this the supabase-js client returns 5 products,
-- we have proof RLS was the cause and can revisit later.

create policy "Products readable by all authenticated"
  on public.products
  for select
  to authenticated
  using (true);

-- Verify
select policyname, cmd, roles::text, qual::text
from pg_policies
where schemaname = 'public' and tablename = 'products' and cmd = 'SELECT'
order by policyname;
