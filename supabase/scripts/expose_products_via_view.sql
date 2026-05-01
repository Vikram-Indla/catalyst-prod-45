-- ────────────────────────────────────────────────────────────────────────
-- Block C follow-up v4 (2026-05-01) — expose products via a view.
--
-- WHY: PostgREST has refused to add producthub_workstreams to its
-- schema cache despite multiple DDL events, manual NOTIFY calls, and
-- a freshly-installed pgrst_watch event trigger (v3). The table exists,
-- has the INV row, has correct grants and RLS, but PostgREST won't see
-- it. Rather than continue debugging the cache miss, we expose the data
-- through a fresh entity (a view) that PostgREST can introspect cleanly.
--
-- The view is read-only by design — products are managed via Lovable's
-- own admin tooling, not via end-user inserts. Any future write paths
-- can target the underlying table directly (via service_role) or via a
-- dedicated RPC function.
--
-- PASTE INTO: Supabase SQL Editor → Run.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Create the view. SECURITY INVOKER so RLS on the underlying table
-- still applies — anonymous and authenticated users see only what the
-- table's RLS policy permits (currently "Anyone can read", so all rows).
create or replace view public.products
with (security_invoker = true)
as
select
  id,
  key,
  name,
  description,
  lead_id,
  member_ids,
  is_archived,
  created_at,
  updated_at
from public.producthub_workstreams;

-- 2. Grants on the view itself. Views need their own grants in PostgREST.
grant select on public.products to anon, authenticated, service_role;

-- 3. Comment to make the view's intent clear in any future inspection
-- AND to fire pgrst_watch one more time. Both useful.
comment on view public.products
  is 'Products list for /product-hub/products. Read-only view over producthub_workstreams. Block C/D 2026-05-01.';

-- 4. Belt-and-suspenders explicit notify.
notify pgrst, 'reload schema';

-- 5. Verify the view exists and returns data.
select
  count(*)                         as product_count,
  array_agg(key  order by key)     as keys,
  array_agg(name order by key)     as names
from public.products;
