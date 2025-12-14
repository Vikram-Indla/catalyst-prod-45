-- Create demand_process_steps table for admin-configurable process steps
CREATE TABLE IF NOT EXISTS public.demand_process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demand_process_steps ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for dropdowns)
CREATE POLICY "Allow public read access to demand_process_steps"
  ON public.demand_process_steps
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage
CREATE POLICY "Allow authenticated users to manage demand_process_steps"
  ON public.demand_process_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed with initial process steps (matching existing hardcoded values)
INSERT INTO public.demand_process_steps (value, label, sort_order) VALUES
  ('new_request', 'New request', 1),
  ('new_demand', 'New demand', 2),
  ('in_review', 'In review', 3),
  ('analyse', 'Analyse', 4),
  ('approved', 'Approved', 5),
  ('ready_to_implement', 'Ready to implement', 6),
  ('implement', 'Implement', 7),
  ('closed', 'Closed', 8),
  ('rejected', 'Rejected', 9),
  ('on_hold', 'On-hold', 10)
ON CONFLICT (value) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_demand_process_steps_updated_at
  BEFORE UPDATE ON public.demand_process_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();