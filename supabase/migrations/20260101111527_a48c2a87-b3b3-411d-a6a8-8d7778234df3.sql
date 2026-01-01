-- Create capacity_assignment_types table for configurable assignment types
CREATE TABLE public.capacity_assignment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capacity_assignment_types ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow all authenticated users to read
CREATE POLICY "Allow read access to assignment types"
ON public.capacity_assignment_types
FOR SELECT
USING (true);

-- Allow authenticated users to manage (for admin)
CREATE POLICY "Allow insert for authenticated users"
ON public.capacity_assignment_types
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.capacity_assignment_types
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete for authenticated users"
ON public.capacity_assignment_types
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_capacity_assignment_types_updated_at
BEFORE UPDATE ON public.capacity_assignment_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial assignment types
INSERT INTO public.capacity_assignment_types (name, sort_order) VALUES
  ('Senaei BAU', 1),
  ('Innovation Platform', 2),
  ('Inspection Project', 3),
  ('International Relations', 4),
  ('MIM Website', 5),
  ('Senaei OPS', 6),
  ('Sectorial Services', 7);