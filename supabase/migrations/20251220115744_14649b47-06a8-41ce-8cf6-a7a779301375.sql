-- Add converted_to_key and converted_by columns to incidents table
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS converted_to_key TEXT,
ADD COLUMN IF NOT EXISTS converted_by UUID;