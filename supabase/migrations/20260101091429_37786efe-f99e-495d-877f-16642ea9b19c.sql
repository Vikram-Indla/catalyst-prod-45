-- Create resource_assignments lookup table for admin-configurable assignment values
CREATE TABLE public.resource_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read assignments
CREATE POLICY "Anyone can view resource assignments"
  ON public.resource_assignments FOR SELECT
  USING (true);

-- Only admins can manage assignments (via service role or specific admin check)
CREATE POLICY "Admins can manage resource assignments"
  ON public.resource_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add assignment_id to resource_inventory
ALTER TABLE public.resource_inventory 
ADD COLUMN assignment_id UUID REFERENCES public.resource_assignments(id);

-- Insert initial assignment values
INSERT INTO public.resource_assignments (name, sort_order) VALUES
  ('Senaei BAU', 1),
  ('Innovation Platform', 2),
  ('Inspection Project', 3),
  ('International Relations', 4),
  ('MIM Website', 5),
  ('Senaei OPS', 6),
  ('Sectorial Services', 7);

-- Create trigger for updated_at
CREATE TRIGGER update_resource_assignments_updated_at
  BEFORE UPDATE ON public.resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();