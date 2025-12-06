-- Create modules table for defining available system modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_default_enabled BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create org_modules table for tracking which modules are enabled per organization
CREATE TABLE public.org_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_code)
);

-- Create packages table for predefined module bundles
CREATE TABLE public.module_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create package_modules junction table
CREATE TABLE public.package_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT NOT NULL REFERENCES public.module_packages(code) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(package_code, module_code)
);

-- Create active_package table to track which package is selected
CREATE TABLE public.active_package (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT REFERENCES public.module_packages(code) ON DELETE SET NULL,
  is_custom BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_package ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules (everyone can read, only admins can modify)
CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for org_modules
CREATE POLICY "Anyone can view org_modules" ON public.org_modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage org_modules" ON public.org_modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for module_packages
CREATE POLICY "Anyone can view packages" ON public.module_packages FOR SELECT USING (true);
CREATE POLICY "Admins can manage packages" ON public.module_packages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for package_modules
CREATE POLICY "Anyone can view package_modules" ON public.package_modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage package_modules" ON public.package_modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for active_package
CREATE POLICY "Anyone can view active_package" ON public.active_package FOR SELECT USING (true);
CREATE POLICY "Admins can manage active_package" ON public.active_package FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed data: Insert default modules
INSERT INTO public.modules (code, name, description, icon, is_default_enabled, display_order) VALUES
('PRODUCT', 'Product', 'Demand intake, business requests, and product management', 'Package', true, 1),
('ENTERPRISE', 'Enterprise / Strategy', 'Strategic planning, OKRs, and enterprise roadmaps', 'Building2', false, 2),
('PORTFOLIO', 'Portfolio', 'Portfolio management, themes, and epic backlogs', 'Briefcase', false, 3),
('PROGRAM', 'Program', 'Program boards, features, and PI planning', 'Layers', false, 4),
('TEAMS', 'Teams', 'Team rooms, sprints, and story management', 'Users', false, 5);

-- Seed data: Insert default packages
INSERT INTO public.module_packages (code, name, description, display_order) VALUES
('CUSTOM', 'None / Custom', 'Manual module selection', 0),
('PRODUCT_STARTER', 'Product Starter', 'Product module only for demand intake', 1),
('PRODUCT_DELIVERY', 'Product + Delivery', 'Product with Program and Teams for delivery', 2),
('STRATEGY_PRODUCT', 'Strategy + Product', 'Enterprise strategy with Product management', 3),
('FULL_CATALYST', 'Full Catalyst', 'All modules enabled for complete SAFe implementation', 4);

-- Seed data: Package module associations
INSERT INTO public.package_modules (package_code, module_code) VALUES
('PRODUCT_STARTER', 'PRODUCT'),
('PRODUCT_DELIVERY', 'PRODUCT'),
('PRODUCT_DELIVERY', 'PROGRAM'),
('PRODUCT_DELIVERY', 'TEAMS'),
('STRATEGY_PRODUCT', 'ENTERPRISE'),
('STRATEGY_PRODUCT', 'PRODUCT'),
('FULL_CATALYST', 'PRODUCT'),
('FULL_CATALYST', 'ENTERPRISE'),
('FULL_CATALYST', 'PORTFOLIO'),
('FULL_CATALYST', 'PROGRAM'),
('FULL_CATALYST', 'TEAMS');

-- Initialize org_modules with default settings (Product enabled by default)
INSERT INTO public.org_modules (module_code, is_enabled) VALUES
('PRODUCT', true),
('ENTERPRISE', false),
('PORTFOLIO', false),
('PROGRAM', false),
('TEAMS', false);

-- Initialize active_package with Custom (no package selected)
INSERT INTO public.active_package (package_code, is_custom) VALUES ('CUSTOM', true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_modules_updated_at();

CREATE TRIGGER update_org_modules_updated_at
  BEFORE UPDATE ON public.org_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_modules_updated_at();