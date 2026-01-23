-- Add RID column to resource_inventory table for unlinked records
-- This ensures all users (whether from profiles or inventory) have a unique 3-digit RID

-- Add the rid column to resource_inventory
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS rid TEXT UNIQUE;

-- Modify the generate_rid function to work with a shared sequence
-- that considers both profiles and resource_inventory
CREATE OR REPLACE FUNCTION generate_rid()
RETURNS TRIGGER AS $$
DECLARE
  next_val INT;
BEGIN
  IF NEW.rid IS NULL THEN
    -- Get the max RID from both tables and increment
    SELECT COALESCE(MAX(rid::int), 0) + 1 INTO next_val
    FROM (
      SELECT rid FROM public.profiles WHERE rid ~ '^\d+$'
      UNION ALL
      SELECT rid FROM public.resource_inventory WHERE rid ~ '^\d+$'
    ) combined;
    
    NEW.rid := LPAD(next_val::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for resource_inventory
DROP TRIGGER IF EXISTS set_resource_inventory_rid ON public.resource_inventory;
CREATE TRIGGER set_resource_inventory_rid
  BEFORE INSERT ON public.resource_inventory
  FOR EACH ROW
  EXECUTE FUNCTION generate_rid();

-- Backfill unlinked resource_inventory records with RIDs
-- Start from the max existing RID + 1
WITH max_rid AS (
  SELECT COALESCE(MAX(rid::int), 0) as max_val
  FROM (
    SELECT rid FROM public.profiles WHERE rid ~ '^\d+$'
    UNION ALL
    SELECT rid FROM public.resource_inventory WHERE rid ~ '^\d+$'
  ) combined
),
ordered_inventory AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC) as rn
  FROM public.resource_inventory
  WHERE rid IS NULL AND profile_id IS NULL
)
UPDATE public.resource_inventory ri
SET rid = LPAD((mr.max_val + oi.rn)::text, 3, '0')
FROM ordered_inventory oi, max_rid mr
WHERE ri.id = oi.id;