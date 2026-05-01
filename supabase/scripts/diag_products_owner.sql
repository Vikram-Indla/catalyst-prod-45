-- Compare INV vs other products on every column. Looking for what's
-- different that could explain why authenticated users see 4 of 5.

select id, code, name, is_active, owner_id, color, sort_order, created_at
from public.products
order by sort_order;
