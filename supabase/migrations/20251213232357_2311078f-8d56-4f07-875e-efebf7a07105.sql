-- Add role_name column to resource_inventory for independent editing
ALTER TABLE public.resource_inventory
ADD COLUMN IF NOT EXISTS role_name text NULL;

-- Populate role_name from role_catalog for existing records
UPDATE public.resource_inventory ri
SET role_name = rc.name
FROM public.role_catalog rc
WHERE ri.role_code = rc.code AND ri.role_name IS NULL;

-- Make role_code a plain text field (remove FK constraint if exists)
-- This allows editing role_code independently
ALTER TABLE public.resource_inventory
DROP CONSTRAINT IF EXISTS resource_inventory_role_code_fkey;