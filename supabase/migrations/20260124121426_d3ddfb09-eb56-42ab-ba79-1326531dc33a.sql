-- Add country_id column to resource_countries
ALTER TABLE public.resource_countries 
ADD COLUMN IF NOT EXISTS country_id text;