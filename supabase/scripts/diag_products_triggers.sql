-- Find triggers on public.products that reference product_key
-- (which doesn't exist on this table). Suspect a misplaced trigger
-- copied from another table.

select
  t.tgname        as trigger_name,
  CASE t.tgtype::int & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END as timing,
  CASE
    WHEN t.tgtype::int & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype::int & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype::int & 16 = 16 THEN 'UPDATE'
    ELSE 'UNKNOWN'
  END as event,
  p.proname       as function_name,
  pg_get_functiondef(p.oid) as function_body
from pg_trigger t
join pg_class c    on c.oid  = t.tgrelid
join pg_proc p     on p.oid  = t.tgfoid
where c.relname = 'products'
  and c.relnamespace::regnamespace::text = 'public'
  and not t.tgisinternal
order by t.tgname;
