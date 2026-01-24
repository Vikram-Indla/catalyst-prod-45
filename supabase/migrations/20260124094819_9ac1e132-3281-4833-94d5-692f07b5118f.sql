-- Add vendor_id column to resource_assignments
ALTER TABLE public.resource_assignments 
ADD COLUMN vendor_id UUID REFERENCES public.resource_vendors(id);

-- Create index for better performance
CREATE INDEX idx_resource_assignments_vendor_id ON public.resource_assignments(vendor_id);