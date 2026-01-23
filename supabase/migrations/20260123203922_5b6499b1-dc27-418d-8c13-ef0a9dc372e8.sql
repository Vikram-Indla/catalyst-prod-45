-- Add resource_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS resource_type text;

-- Add resource_type column to resource_inventory table
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS resource_type text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.resource_type IS 'Resource type: Fixed, Core, or Freelance';
COMMENT ON COLUMN public.resource_inventory.resource_type IS 'Resource type: Fixed, Core, or Freelance';