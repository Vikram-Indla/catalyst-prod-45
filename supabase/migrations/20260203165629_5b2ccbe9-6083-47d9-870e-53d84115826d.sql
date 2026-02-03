-- Create t10_labels table for label management
CREATE TABLE IF NOT EXISTS public.t10_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.t10_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies - everyone can read labels
CREATE POLICY "Labels are viewable by everyone" 
ON public.t10_labels 
FOR SELECT 
USING (true);

-- Authenticated users can create labels
CREATE POLICY "Authenticated users can create labels" 
ON public.t10_labels 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update labels they created
CREATE POLICY "Users can update their own labels" 
ON public.t10_labels 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Users can delete labels they created
CREATE POLICY "Users can delete their own labels" 
ON public.t10_labels 
FOR DELETE 
USING (auth.uid() = created_by);

-- Seed default labels
INSERT INTO public.t10_labels (name, color) VALUES
  ('Bug Fix', '#ef4444'),
  ('Feature', '#8b5cf6'),
  ('Documentation', '#06b6d4'),
  ('Testing', '#f59e0b'),
  ('Security', '#dc2626'),
  ('Code Review', '#10b981'),
  ('Critical', '#dc2626'),
  ('High', '#f97316'),
  ('Medium', '#eab308'),
  ('Low', '#22c55e'),
  ('Blocked', '#ef4444'),
  ('Needs Review', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;