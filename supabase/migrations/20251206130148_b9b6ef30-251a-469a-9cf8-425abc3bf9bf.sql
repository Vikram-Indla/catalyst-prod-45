-- Business Lines table
CREATE TABLE public.business_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_lines
CREATE POLICY "Anyone can view business lines" ON public.business_lines
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage business lines" ON public.business_lines
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Demand Tab Configuration table
CREATE TABLE public.demand_tab_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_id UUID REFERENCES public.business_lines(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_line_id, tab_key)
);

-- Enable RLS
ALTER TABLE public.demand_tab_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view tab configs" ON public.demand_tab_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tab configs" ON public.demand_tab_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Demand Section Configuration table
CREATE TABLE public.demand_section_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_id UUID REFERENCES public.business_lines(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  name TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  collapsed_by_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_line_id, tab_key, section_key)
);

-- Enable RLS
ALTER TABLE public.demand_section_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view section configs" ON public.demand_section_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage section configs" ON public.demand_section_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Demand Field Configuration table
CREATE TABLE public.demand_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_id UUID REFERENCES public.business_lines(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  tab_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  rules_json JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_line_id, field_key)
);

-- Enable RLS
ALTER TABLE public.demand_field_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view field configs" ON public.demand_field_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage field configs" ON public.demand_field_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Product Status Configuration table
CREATE TABLE public.product_status_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('todo', 'inprogress', 'done', 'other')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_status_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view status configs" ON public.product_status_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage status configs" ON public.product_status_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Product View Column Configuration table
CREATE TABLE public.product_view_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_id UUID REFERENCES public.business_lines(id) ON DELETE CASCADE,
  view_type TEXT NOT NULL CHECK (view_type IN ('list', 'kanban')),
  column_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  is_default_sort BOOLEAN NOT NULL DEFAULT false,
  sort_direction TEXT CHECK (sort_direction IN ('asc', 'desc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_line_id, view_type, column_key)
);

-- Enable RLS
ALTER TABLE public.product_view_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view view configs" ON public.product_view_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage view configs" ON public.product_view_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_business_lines_updated_at
  BEFORE UPDATE ON public.business_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demand_tab_configs_updated_at
  BEFORE UPDATE ON public.demand_tab_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demand_section_configs_updated_at
  BEFORE UPDATE ON public.demand_section_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demand_field_configs_updated_at
  BEFORE UPDATE ON public.demand_field_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_status_configs_updated_at
  BEFORE UPDATE ON public.product_status_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_view_configs_updated_at
  BEFORE UPDATE ON public.product_view_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business lines
INSERT INTO public.business_lines (key, name, description, is_default, is_active, sort_order)
VALUES 
  ('IND', 'Industry', 'Industrial sector business requests', true, true, 0),
  ('MIN', 'Mining', 'Mining sector business requests', false, true, 1);

-- Insert default product statuses
INSERT INTO public.product_status_configs (status_key, name, category, is_default, position)
VALUES
  ('new_demand', 'New Demand', 'todo', true, 0),
  ('analyse', 'Analyse', 'inprogress', false, 1),
  ('approved', 'Approved', 'inprogress', false, 2),
  ('implement', 'Implement', 'inprogress', false, 3),
  ('closed', 'Closed', 'done', false, 4),
  ('rejected', 'Rejected', 'other', false, 5),
  ('on_hold', 'On Hold', 'other', false, 6);