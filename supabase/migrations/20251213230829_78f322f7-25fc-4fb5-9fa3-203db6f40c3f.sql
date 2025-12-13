-- Create role_catalog table for Development Inventory
CREATE TABLE public.role_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_catalog
CREATE POLICY "Approved users can view role_catalog"
  ON public.role_catalog FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage role_catalog"
  ON public.role_catalog FOR ALL
  USING (public.is_admin(auth.uid()));

-- Seed role_catalog with roles
INSERT INTO public.role_catalog (code, name, sort_order) VALUES
  ('NET', '.NET Developer', 10),
  ('BE', 'Backend Developer', 20),
  ('BE-L', 'Backend Lead', 30),
  ('DATA', 'Data Engineer', 40),
  ('DEVOPS', 'DevOps', 50),
  ('FE', 'Front-end Developer', 60),
  ('FE-L', 'Front-end Lead', 70),
  ('MOB', 'Mobile Developer', 80),
  ('MOB-L', 'Mobile Lead', 90),
  ('PM', 'Project Manager', 100),
  ('QA', 'QA Tester', 110),
  ('TPO', 'Technical Product Owner', 120),
  ('DM', 'Delivery Manager', 130);

-- Create development_inventory table
CREATE TABLE public.development_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_code TEXT REFERENCES public.role_catalog(code),
  project_id UUID REFERENCES public.projects(id),
  start_date DATE,
  end_date DATE,
  capacity_percent INTEGER NOT NULL DEFAULT 100 CHECK (capacity_percent >= 0 AND capacity_percent <= 100),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_development_inventory_name ON public.development_inventory(name);
CREATE INDEX idx_development_inventory_role_code ON public.development_inventory(role_code);
CREATE INDEX idx_development_inventory_project_id ON public.development_inventory(project_id);

-- Enable RLS
ALTER TABLE public.development_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Approved users can view development_inventory"
  ON public.development_inventory FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage development_inventory"
  ON public.development_inventory FOR ALL
  USING (public.is_admin(auth.uid()));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_development_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_development_inventory_timestamp
  BEFORE UPDATE ON public.development_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_development_inventory_updated_at();