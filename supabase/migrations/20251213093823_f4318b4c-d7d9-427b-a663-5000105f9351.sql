-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create business_owners table
CREATE TABLE IF NOT EXISTS public.business_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create department_owner_mapping table (1:1 mapping)
CREATE TABLE IF NOT EXISTS public.department_owner_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.business_owners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id)
);

-- Add department_id and business_owner_id columns to business_requests table
ALTER TABLE public.business_requests 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS business_owner_id UUID REFERENCES public.business_owners(id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_owner_mapping ENABLE ROW LEVEL SECURITY;

-- RLS policies for departments (read by all approved users, write by admins)
CREATE POLICY "Approved users can view departments" ON public.departments
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for business_owners (read by all approved users, write by admins)
CREATE POLICY "Approved users can view business owners" ON public.business_owners
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage business owners" ON public.business_owners
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for department_owner_mapping (read by all approved users, write by admins)
CREATE POLICY "Approved users can view department owner mapping" ON public.department_owner_mapping
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage department owner mapping" ON public.department_owner_mapping
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert the 7 Departments
INSERT INTO public.departments (name, sort_order, is_active) VALUES
  ('Industrial License', 1, true),
  ('Industrial Compliance', 2, true),
  ('Future Factories & Advanced Manufacturing Center', 3, true),
  ('Standard Incentive', 4, true),
  ('ICP', 5, true),
  ('Industry Investment Tracking', 6, true),
  ('Mining Investor Journey', 7, true)
ON CONFLICT (name) DO NOTHING;

-- Insert the 7 Business Owners
INSERT INTO public.business_owners (name, sort_order, is_active) VALUES
  ('Saud Alanize', 1, true),
  ('Mohammed Alotaibi', 2, true),
  ('Youssef Almagnonie', 3, true),
  ('Suhaip', 4, true),
  ('Abu Badr', 5, true),
  ('Fahad Aljubary', 6, true),
  ('Ali Alamary', 7, true)
ON CONFLICT (name) DO NOTHING;

-- Create department → owner mappings (1:1)
INSERT INTO public.department_owner_mapping (department_id, owner_id)
SELECT d.id, o.id FROM public.departments d, public.business_owners o
WHERE (d.name = 'Industrial License' AND o.name = 'Saud Alanize')
   OR (d.name = 'Industrial Compliance' AND o.name = 'Mohammed Alotaibi')
   OR (d.name = 'Future Factories & Advanced Manufacturing Center' AND o.name = 'Youssef Almagnonie')
   OR (d.name = 'Standard Incentive' AND o.name = 'Suhaip')
   OR (d.name = 'ICP' AND o.name = 'Abu Badr')
   OR (d.name = 'Industry Investment Tracking' AND o.name = 'Fahad Aljubary')
   OR (d.name = 'Mining Investor Journey' AND o.name = 'Ali Alamary')
ON CONFLICT (department_id) DO NOTHING;

-- Migrate existing business_requests: map text values to IDs
UPDATE public.business_requests br
SET department_id = d.id
FROM public.departments d
WHERE br.department IS NOT NULL 
  AND br.department_id IS NULL
  AND LOWER(TRIM(br.department)) = LOWER(TRIM(d.name));

UPDATE public.business_requests br
SET business_owner_id = o.id
FROM public.business_owners o
WHERE br.business_owner IS NOT NULL 
  AND br.business_owner_id IS NULL
  AND LOWER(TRIM(br.business_owner)) = LOWER(TRIM(o.name));

-- Auto-set business_owner_id from department mapping if only department_id is set
UPDATE public.business_requests br
SET business_owner_id = dom.owner_id
FROM public.department_owner_mapping dom
WHERE br.department_id IS NOT NULL 
  AND br.business_owner_id IS NULL
  AND br.department_id = dom.department_id;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_departments_updated_at();

CREATE TRIGGER update_business_owners_updated_at
  BEFORE UPDATE ON public.business_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_departments_updated_at();