-- Create planner_workstreams table for tracks
CREATE TABLE public.planner_workstreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#6366f1',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_workstreams ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read workstreams
CREATE POLICY "Anyone can read workstreams" 
ON public.planner_workstreams 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage workstreams
CREATE POLICY "Authenticated users can manage workstreams" 
ON public.planner_workstreams 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert the tracks as workstreams
INSERT INTO public.planner_workstreams (name, slug, color, sort_order) VALUES
('Senaie Track', 'senaie-track', '#0d9488', 1),
('MIM Website Track', 'mim-website-track', '#2563eb', 2),
('Tahommona Track', 'tahommona-track', '#8b5cf6', 3),
('Stand-Alone Projects Track', 'stand-alone-projects-track', '#d97706', 4),
('Data & AI Track', 'data-ai-track', '#ef4444', 5),
('Delivery Track', 'delivery-track', '#10b981', 6),
('Catalyst Track', 'catalyst-track', '#ec4899', 7);