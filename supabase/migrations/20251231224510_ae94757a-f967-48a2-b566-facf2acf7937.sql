-- Create capacity_departments table for capacity planner specific departments
CREATE TABLE IF NOT EXISTS public.capacity_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#0d9488',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capacity_departments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view capacity departments" 
ON public.capacity_departments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage capacity departments" 
ON public.capacity_departments FOR ALL 
USING (auth.role() = 'authenticated');

-- Add department_id to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department_id') THEN
    ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.capacity_departments(id);
  END IF;
END $$;

-- Insert default departments
INSERT INTO public.capacity_departments (name, description, color, sort_order) VALUES
  ('Product', 'Product Management and Design', '#d4b896', 1),
  ('Delivery', 'Engineering and Development', '#0d9488', 2),
  ('Support', 'Operations and Customer Support', '#4d8b4d', 3)
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.capacity_departments;