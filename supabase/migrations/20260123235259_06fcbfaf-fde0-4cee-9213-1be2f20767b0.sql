-- Add CTC (Cost to Company) field to profiles and resource_inventory tables
-- CTC is stored as a numeric value in SAR currency

-- Add ctc column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ctc numeric(12,2) DEFAULT NULL;

-- Add ctc column to resource_inventory table
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS ctc numeric(12,2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.ctc IS 'Cost to Company in SAR (Saudi Riyal)';
COMMENT ON COLUMN public.resource_inventory.ctc IS 'Cost to Company in SAR (Saudi Riyal)';