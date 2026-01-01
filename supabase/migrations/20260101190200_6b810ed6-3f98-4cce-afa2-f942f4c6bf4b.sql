-- Create table for resource allocations (supports split allocations across multiple assignments)
CREATE TABLE public.resource_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resource_inventory(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.resource_assignments(id) ON DELETE CASCADE,
  allocation_percent INTEGER NOT NULL DEFAULT 100 CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- A resource can only have one allocation entry per assignment
  UNIQUE(resource_id, assignment_id)
);

-- Enable Row Level Security
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view resource allocations" 
ON public.resource_allocations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create resource allocations" 
ON public.resource_allocations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update resource allocations" 
ON public.resource_allocations 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete resource allocations" 
ON public.resource_allocations 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_resource_allocations_updated_at
BEFORE UPDATE ON public.resource_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_allocations;

-- Create index for faster lookups
CREATE INDEX idx_resource_allocations_resource_id ON public.resource_allocations(resource_id);
CREATE INDEX idx_resource_allocations_assignment_id ON public.resource_allocations(assignment_id);