-- Create theme_statuses table for configurable theme status options
CREATE TABLE public.theme_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'neutral',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_statuses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read theme statuses (needed for dropdown options)
CREATE POLICY "Theme statuses are viewable by everyone" 
ON public.theme_statuses 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage theme statuses (admin functionality)
CREATE POLICY "Authenticated users can manage theme statuses" 
ON public.theme_statuses 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default theme statuses
INSERT INTO public.theme_statuses (value, label, color, sort_order) VALUES
  ('draft', 'Draft', 'neutral', 1),
  ('active', 'Active', 'info', 2),
  ('approved', 'Approved', 'forest', 3),
  ('on_hold', 'On Hold', 'warning', 4),
  ('archived', 'Archived', 'stone', 5);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_theme_statuses_updated_at
BEFORE UPDATE ON public.theme_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();