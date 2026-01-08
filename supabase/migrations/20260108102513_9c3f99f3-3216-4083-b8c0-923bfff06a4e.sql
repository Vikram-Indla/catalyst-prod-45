-- Remove incorrect uniqueness constraint on resource_inventory.name (names are not unique)
ALTER TABLE public.resource_inventory
DROP CONSTRAINT IF EXISTS resource_inventory_name_key;