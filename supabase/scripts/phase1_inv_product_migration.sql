-- ════════════════════════════════════════════════════════════════════════
-- Phase 1 (2026-05-01) — Wire the 173 Notion+Jira rows into public.products.
--
-- WHAT THIS DOES:
--   1. Adds 'INV — Investor Journey' as a 5th row in public.products.
--   2. Captures the OLD INV uuid from producthub_workstreams (if that
--      orphan table still exists), so we can find the rows pointing at it.
--   3. Repoints mim_business_requests.product_id from the old INV uuid
--      to the new public.products.INV uuid.
--   4. Drops the FK from mim_business_requests → producthub_workstreams.
--   5. Re-adds the FK pointing at public.products.id (the canonical).
--   6. Drops the producthub_workstreams orphan table.
--
-- DEFENSIVE: every step uses IF EXISTS / IF NOT EXISTS / ON CONFLICT so
-- it's safe to run regardless of whether the orphan table is still there
-- or has already been dropped.
--
-- AFTER THIS RUNS:
--   - public.products has 5 rows: MINI, SEN, ENT, UNA, INV
--   - mim_business_requests has 173 rows (unchanged), each with a
--     product_id that resolves to public.products.INV.id
--   - producthub_workstreams is gone
--   - /product-hub/INV/* URLs will surface the 173 rows once Phase 3 lands
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- 1. Insert INV into public.products (idempotent on code uniqueness)
insert into public.products (name, code, description, color, is_active, sort_order)
values (
  'Investor Journey',
  'INV',
  'Investor-facing product line — Jira MDT + Notion ⭐ Features (173 BRs).',
  '#6554C0',
  true,
  5
)
on conflict (code) do update
  set name        = excluded.name,
      description = excluded.description,
      color       = excluded.color,
      is_active   = excluded.is_active;

-- 2-3. Repoint mim_business_requests rows. Wrapped in DO so we can
-- (a) handle the case where producthub_workstreams already gone,
-- (b) report row counts via NOTICE.
do $$
declare
  old_inv_id uuid;
  new_inv_id uuid;
  updated_count int;
  orphan_exists boolean;
begin
  -- Does the orphan still exist?
  select exists(
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename  = 'producthub_workstreams'
  ) into orphan_exists;

  -- New canonical INV id
  select id into new_inv_id
  from public.products
  where code = 'INV';

  raise notice 'New INV id (public.products): %', new_inv_id;

  if orphan_exists then
    -- Capture old INV id from the orphan table
    execute 'select id from public.producthub_workstreams where key = ''INV'''
    into old_inv_id;

    raise notice 'Old INV id (producthub_workstreams): %', old_inv_id;

    -- Repoint rows that pointed at the old INV
    if old_inv_id is not null and new_inv_id is not null then
      update public.mim_business_requests
      set product_id = new_inv_id
      where product_id = old_inv_id;

      get diagnostics updated_count = row_count;
      raise notice 'Repointed % mim_business_requests rows from old INV → new INV', updated_count;
    end if;
  else
    raise notice 'producthub_workstreams already gone — nothing to repoint';
  end if;

  -- Catch any rows whose product_id is NULL or doesn't resolve in
  -- public.products and pin them to INV (safe default for the seeded set).
  update public.mim_business_requests
  set product_id = new_inv_id
  where (product_id is null
         or product_id not in (select id from public.products));

  get diagnostics updated_count = row_count;
  raise notice 'Default-assigned % unresolved mim_business_requests rows → INV', updated_count;
end $$;

-- 4. Drop any existing FK from mim_business_requests on product_id.
-- We don't know the constraint name exactly, so loop and drop all FKs
-- where the FIRST referenced column is product_id (covers single-column
-- FKs, which is the only shape we're dealing with here). Cast attname to
-- text explicitly — pg_attribute.attname is type `name`, not `text`, and
-- the @> array operator is fussy about that.
do $$
declare
  con record;
begin
  for con in
    select c.conname,
           (select a.attname::text
              from pg_attribute a
              where a.attrelid = c.conrelid
                and a.attnum   = c.conkey[1]) as first_col
    from pg_constraint c
    where c.conrelid = 'public.mim_business_requests'::regclass
      and c.contype  = 'f'
  loop
    if con.first_col = 'product_id' then
      execute format(
        'alter table public.mim_business_requests drop constraint %I',
        con.conname
      );
      raise notice 'Dropped FK % on product_id', con.conname;
    end if;
  end loop;
end $$;

-- 5. Re-add FK pointing at the canonical public.products
alter table public.mim_business_requests
  add constraint mim_business_requests_product_id_fkey
  foreign key (product_id) references public.products(id)
  on delete set null;

-- 6. Drop the orphan table now that no FK references it
drop table if exists public.producthub_workstreams cascade;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (read-only; safe to re-run)
-- ════════════════════════════════════════════════════════════════════════
select
  p.code,
  p.name,
  p.is_active,
  p.sort_order,
  count(m.id) as mim_row_count
from public.products p
left join public.mim_business_requests m on m.product_id = p.id
group by p.id, p.code, p.name, p.is_active, p.sort_order
order by p.sort_order;

-- Count of rows still pointing at non-existent product (should be 0)
select count(*) as orphan_rows
from public.mim_business_requests m
where m.product_id is not null
  and m.product_id not in (select id from public.products);
