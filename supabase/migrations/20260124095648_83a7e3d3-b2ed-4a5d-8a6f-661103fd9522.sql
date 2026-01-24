-- Add flag_svg column to resource_countries for storing country flag SVG URLs
ALTER TABLE public.resource_countries 
ADD COLUMN IF NOT EXISTS flag_svg text;