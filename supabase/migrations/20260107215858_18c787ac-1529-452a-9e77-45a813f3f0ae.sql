-- Add department_name and assignments fields directly to resource_inventory
ALTER TABLE public.resource_inventory
ADD COLUMN IF NOT EXISTS department_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assignments jsonb DEFAULT '[]'::jsonb;

-- Add a comment to clarify the structure
COMMENT ON COLUMN public.resource_inventory.assignments IS 'JSONB array of assignments: [{id: uuid, name: string, request_key: string}]';
COMMENT ON COLUMN public.resource_inventory.department_name IS 'Denormalized department name for direct display';

-- Backfill department_name from profiles -> capacity_departments
UPDATE public.resource_inventory ri
SET department_name = cd.name
FROM public.profiles p
JOIN public.capacity_departments cd ON cd.id = p.department_id
WHERE ri.profile_id = p.id
  AND ri.department_name IS NULL;

-- Backfill assignments from resource_allocations -> resource_assignments
UPDATE public.resource_inventory ri
SET assignments = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ra2.assignment_id,
        'name', ras.name
      )
    )
    FROM public.resource_allocations ra2
    JOIN public.resource_assignments ras ON ras.id = ra2.assignment_id
    WHERE ra2.resource_id = ri.id
  ),
  '[]'::jsonb
);

-- Drop capacity_bookings table (it's empty and user confirmed deletion)
DROP TABLE IF EXISTS public.capacity_bookings;