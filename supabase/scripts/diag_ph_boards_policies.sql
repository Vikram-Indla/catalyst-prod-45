-- Single-purpose diagnostic: show ALL policies (not just SELECT) on ph_boards.
-- Authenticated users see 0 rows even though my fix dropped SELECT policies
-- and created USING(true). A FOR ALL policy with a restrictive USING clause
-- would still gate SELECT and survived the DROP.

select
  policyname,
  cmd,                              -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE', or 'ALL'
  permissive,                       -- 'PERMISSIVE' or 'RESTRICTIVE'
  roles,                            -- which roles it applies to
  qual::text       as using_clause, -- the gating expression
  with_check::text as wc_clause
from pg_policies
where schemaname = 'public'
  and tablename = 'ph_boards'
order by cmd, policyname;
