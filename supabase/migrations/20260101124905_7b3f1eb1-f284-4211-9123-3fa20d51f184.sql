-- Link resource_inventory rows to user profiles reliably (stop name-based matching)
ALTER TABLE public.resource_inventory
ADD COLUMN IF NOT EXISTS profile_id uuid;

-- Best-effort backfill using full_name match (case-insensitive)
UPDATE public.resource_inventory ri
SET profile_id = p.id
FROM public.profiles p
WHERE ri.profile_id IS NULL
  AND ri.name IS NOT NULL
  AND p.full_name IS NOT NULL
  AND lower(trim(ri.name)) = lower(trim(p.full_name));

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_inventory_profile_id
  ON public.resource_inventory (profile_id);

-- Enforce at most 1 inventory row per profile when profile_id is present
CREATE UNIQUE INDEX IF NOT EXISTS uniq_resource_inventory_profile_id
  ON public.resource_inventory (profile_id)
  WHERE profile_id IS NOT NULL;