-- Test Case Types (e.g., Functional, Regression, Smoke, Integration)
CREATE TABLE IF NOT EXISTS public.test_case_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'file-text',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_case_type_per_program UNIQUE (program_id, name)
);

-- Test Case Priorities
CREATE TABLE IF NOT EXISTS public.test_case_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  weight INTEGER DEFAULT 1, -- For prioritization calculations
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_priority_per_program UNIQUE (program_id, name)
);

-- Test Admin Settings (per-project settings storage)
CREATE TABLE IF NOT EXISTS public.test_admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_setting_per_program UNIQUE (program_id, setting_key)
);

-- Enable RLS
ALTER TABLE public.test_case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for case types
CREATE POLICY "Users can view case types" ON public.test_case_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage case types" ON public.test_case_types FOR ALL USING (true);

-- RLS policies for priorities
CREATE POLICY "Users can view priorities" ON public.test_case_priorities FOR SELECT USING (true);
CREATE POLICY "Admins can manage priorities" ON public.test_case_priorities FOR ALL USING (true);

-- RLS policies for admin settings
CREATE POLICY "Users can view admin settings" ON public.test_admin_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage admin settings" ON public.test_admin_settings FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_case_types_program ON public.test_case_types(program_id);
CREATE INDEX idx_priorities_program ON public.test_case_priorities(program_id);
CREATE INDEX idx_admin_settings_program ON public.test_admin_settings(program_id);

-- Triggers for updated_at
CREATE TRIGGER update_test_case_types_updated_at
BEFORE UPDATE ON public.test_case_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_case_priorities_updated_at
BEFORE UPDATE ON public.test_case_priorities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_admin_settings_updated_at
BEFORE UPDATE ON public.test_admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();