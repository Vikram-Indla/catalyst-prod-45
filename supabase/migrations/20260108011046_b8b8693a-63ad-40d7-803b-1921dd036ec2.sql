-- Add foreign key columns to resource_inventory for proper lookup table relationships
-- These link to the reference tables for capacity planning

-- Add country_id FK column (links to resource_countries)
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.resource_countries(id);

-- Add location_id FK column (links to resource_locations)
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.resource_locations(id);

-- Add vendor_id FK column (links to resource_vendors) 
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.resource_vendors(id);

-- Add department_id FK column (links to capacity_departments)
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.capacity_departments(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_inventory_country_id ON public.resource_inventory(country_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_location_id ON public.resource_inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_vendor_id ON public.resource_inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_department_id ON public.resource_inventory(department_id);