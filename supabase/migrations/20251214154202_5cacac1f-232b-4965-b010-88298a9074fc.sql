-- Create risk_severity_levels table for admin-configurable severity options
CREATE TABLE public.risk_severity_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_severity_levels ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can view severity levels"
ON public.risk_severity_levels
FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage severity levels"
ON public.risk_severity_levels
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_risk_severity_levels_updated_at
BEFORE UPDATE ON public.risk_severity_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default severity levels (to be removed via admin)
INSERT INTO public.risk_severity_levels (value, label, sort_order) VALUES
  ('Low', 'Low', 1),
  ('Medium', 'Medium', 2),
  ('High', 'High', 3),
  ('Critical', 'Critical', 4);