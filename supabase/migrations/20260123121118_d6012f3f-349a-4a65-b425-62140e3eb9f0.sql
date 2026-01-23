-- Create resource_allocations table for capacity planning
CREATE TABLE public.resource_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resource_inventory(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.resource_assignments(id) ON DELETE SET NULL,
  allocation_percent INTEGER NOT NULL DEFAULT 100 CHECK (allocation_percent >= 0 AND allocation_percent <= 200),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'forecast')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX idx_resource_allocations_resource_id ON public.resource_allocations(resource_id);
CREATE INDEX idx_resource_allocations_assignment_id ON public.resource_allocations(assignment_id);
CREATE INDEX idx_resource_allocations_dates ON public.resource_allocations(start_date, end_date);
CREATE INDEX idx_resource_allocations_status ON public.resource_allocations(status);

-- Enable RLS
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow authenticated users full access for capacity planning
CREATE POLICY "Authenticated users can view allocations"
  ON public.resource_allocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert allocations"
  ON public.resource_allocations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update allocations"
  ON public.resource_allocations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete allocations"
  ON public.resource_allocations FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_allocations;

-- Add trigger for updated_at
CREATE TRIGGER update_resource_allocations_updated_at
  BEFORE UPDATE ON public.resource_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();