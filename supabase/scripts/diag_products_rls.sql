-- ONE query only so the SQL editor returns its rows. We need to see the
-- RLS policy expressions that gate SELECT on public.products. Something
-- in those expressions filters INV specifically while letting the
-- 4 pre-existing products through.

select
  policyname,
  cmd,
  permissive,
  roles::text,
  qual::text       as using_clause,
  with_check::text as wc_clause
from pg_policies
where schemaname = 'public'
  and tablename  = 'products'
order by cmd, policyname;
