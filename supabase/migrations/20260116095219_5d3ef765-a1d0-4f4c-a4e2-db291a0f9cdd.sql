-- Backfill department_name from capacity_departments using department_id
UPDATE public.resource_inventory ri
SET department_name = cd.name
FROM public.capacity_departments cd
WHERE ri.department_id = cd.id
  AND ri.department_name IS NULL;

-- Also backfill from profiles where department_id on resource_inventory is null
UPDATE public.resource_inventory ri
SET department_name = cd.name,
    department_id = p.department_id
FROM public.profiles p
JOIN public.capacity_departments cd ON cd.id = p.department_id
WHERE ri.profile_id = p.id
  AND ri.department_name IS NULL
  AND p.department_id IS NOT NULL;