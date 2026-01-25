-- Add department_id to software_licenses table
ALTER TABLE public.software_licenses
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.capacity_departments(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_software_licenses_department_id 
ON public.software_licenses(department_id);