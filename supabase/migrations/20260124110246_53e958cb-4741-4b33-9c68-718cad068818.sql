-- Add start_date and assignment_id columns
ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS assignment_id text;