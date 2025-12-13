-- Create resource_roles reference table
CREATE TABLE public.resource_roles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed resource_roles with initial data
INSERT INTO public.resource_roles (code, name, sort_order) VALUES
  ('PO', 'Product Owner', 10),
  ('BA', 'Business Analyst', 20),
  ('TPO', 'Technical Product Owner', 30),
  ('UX', 'UI/UX Designer', 40),
  ('FE', 'Front-end Developer', 50),
  ('BE', 'Back-end Developer', 60),
  ('QA', 'QA Tester', 70),
  ('PM', 'Project Manager', 80),
  ('PDM', 'Product Manager', 90),
  ('DM', 'Delivery Manager', 100);

-- Create resource_inventory table with normalized role reference
CREATE TABLE public.resource_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_code TEXT REFERENCES public.resource_roles(code),
  default_capacity_percent INTEGER DEFAULT 100 CHECK (default_capacity_percent >= 0 AND default_capacity_percent <= 100),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for resource_roles (read-only for approved users, write for admins)
CREATE POLICY "Approved users can view resource roles"
  ON public.resource_roles FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage resource roles"
  ON public.resource_roles FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- RLS policies for resource_inventory
CREATE POLICY "Approved users can view resource inventory"
  ON public.resource_inventory FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage resource inventory"
  ON public.resource_inventory FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Create updated_at trigger for resource_inventory
CREATE TRIGGER update_resource_inventory_updated_at
  BEFORE UPDATE ON public.resource_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_resource_inventory_role_code ON public.resource_inventory(role_code);
CREATE INDEX idx_resource_inventory_is_active ON public.resource_inventory(is_active);
CREATE INDEX idx_resource_roles_is_active ON public.resource_roles(is_active);