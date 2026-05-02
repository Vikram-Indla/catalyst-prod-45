-- Use prosrc (raw function body) instead of pg_get_functiondef() which
-- triggers system validation that errors on a corrupt/incomplete function
-- somewhere else in this DB. prosrc is just text storage — no validation.

select n.nspname as schema, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog','information_schema','pg_toast')
  and p.prosrc like '%product_key%';
