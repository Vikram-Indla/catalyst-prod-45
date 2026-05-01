-- Hunt for ANY object that references "product_key" in connection with
-- public.products. The INSERT error "record 'new' has no field 'product_key'"
-- means SOMETHING fires on INSERT that expects this column. We've ruled
-- out the only trigger on the table. Cast a wider net.

-- 1. CHECK constraints that might reference product_key
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.products'::regclass
  and contype = 'c';

-- 2. RLS policies' WITH CHECK clauses for INSERT/UPDATE/ALL
select policyname, cmd, qual::text as using_clause, with_check::text as wc_clause
from pg_policies
where schemaname = 'public' and tablename = 'products'
  and (with_check::text ILIKE '%product_key%' OR qual::text ILIKE '%product_key%');

-- 3. Functions in any schema whose body mentions both 'products' and 'product_key'
select n.nspname as schema, p.proname as function_name,
       substring(pg_get_functiondef(p.oid), 1, 200) as body_preview
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and pg_get_functiondef(p.oid) ILIKE '%product_key%'
  and pg_get_functiondef(p.oid) ILIKE '%products%';

-- 4. Triggers on OTHER tables that might fire when products is modified
-- (e.g., FK cascade triggers reaching into a related table that has a
-- function that errors). List all triggers in public schema.
select c.relname as on_table, t.tgname as trigger_name,
       p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p  on p.oid = t.tgfoid
where c.relnamespace::regnamespace::text = 'public'
  and not t.tgisinternal
  and pg_get_functiondef(p.oid) ILIKE '%product_key%'
order by c.relname;
