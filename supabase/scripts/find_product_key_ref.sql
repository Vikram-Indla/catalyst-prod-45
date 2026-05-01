-- One query, finds any function in the DB that references product_key.
-- Run this exactly as-is.

select n.nspname as schema, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog','information_schema','pg_toast')
  and pg_get_functiondef(p.oid) like '%product_key%';
