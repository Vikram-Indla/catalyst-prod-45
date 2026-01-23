-- Add unique constraint for resource allocations to enable upsert logic
ALTER TABLE public.resource_allocations
ADD CONSTRAINT resource_allocations_unique_month 
UNIQUE (resource_id, assignment_id, start_date);