-- Create resource_locations lookup table
CREATE TABLE public.resource_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create resource_countries lookup table
CREATE TABLE public.resource_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create resource_vendors lookup table
CREATE TABLE public.resource_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_vendors ENABLE ROW LEVEL SECURITY;

-- Create policies for all authenticated users to read
CREATE POLICY "Authenticated users can read locations" ON public.resource_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can read countries" ON public.resource_countries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can read vendors" ON public.resource_vendors FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create policies for authenticated users to manage (admin check would be better but simplified here)
CREATE POLICY "Authenticated users can insert locations" ON public.resource_locations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update locations" ON public.resource_locations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete locations" ON public.resource_locations FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert countries" ON public.resource_countries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update countries" ON public.resource_countries FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete countries" ON public.resource_countries FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vendors" ON public.resource_vendors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update vendors" ON public.resource_vendors FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete vendors" ON public.resource_vendors FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_countries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_vendors;

-- Seed with existing unique values from profiles
INSERT INTO public.resource_locations (name, sort_order) VALUES 
  ('Off-Shore', 1),
  ('On-Site', 2),
  ('Onsite', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.resource_countries (name, sort_order) VALUES 
  ('Albania', 1),
  ('Egypt', 2),
  ('India', 3),
  ('Jordan', 4),
  ('Pakistan', 5),
  ('Saudi Arabia', 6),
  ('Sudan', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.resource_vendors (name, sort_order) VALUES 
  ('BMC', 1),
  ('ELM', 2),
  ('Freelance', 3),
  ('Thiqah', 4)
ON CONFLICT (name) DO NOTHING;