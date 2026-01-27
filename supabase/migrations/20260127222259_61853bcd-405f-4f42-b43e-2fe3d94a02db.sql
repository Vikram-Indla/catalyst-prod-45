-- Create business_lines table for product lines
CREATE TABLE public.business_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_lines ENABLE ROW LEVEL SECURITY;

-- Allow public read access (product lines are not user-specific)
CREATE POLICY "Anyone can read business lines"
  ON public.business_lines FOR SELECT
  USING (true);

-- Only authenticated users can manage business lines
CREATE POLICY "Authenticated users can insert business lines"
  ON public.business_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update business lines"
  ON public.business_lines FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete business lines"
  ON public.business_lines FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_business_lines_updated_at
  BEFORE UPDATE ON public.business_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default "Industry" product line
INSERT INTO public.business_lines (key, name, description, is_default, is_active, sort_order)
VALUES ('industry', 'Industry', 'Default product line for industry solutions', true, true, 1);