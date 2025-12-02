-- Create test_case_statuses table per Customize_Case_Statuses.doc
CREATE TABLE public.test_case_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  viewable_by_owner_only BOOLEAN DEFAULT false,
  eligible_for_cycle_set BOOLEAN DEFAULT true,
  eligible_for_linked_step BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_case_priorities table per Customize_Case_Priorities.doc
CREATE TABLE public.test_case_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_run_statuses table per Run_Statuses.doc
CREATE TABLE public.test_run_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  highlight_color TEXT DEFAULT '#6b7280',
  status_type TEXT NOT NULL CHECK (status_type IN ('NOT_RUN', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED')),
  execution_completed BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_field_configurations table per Field_Configurations.doc
CREATE TABLE public.test_field_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('case', 'set', 'cycle', 'run')),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(program_id, entity_type, field_name)
);

-- Enable RLS
ALTER TABLE public.test_case_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_run_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_field_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_case_statuses
CREATE POLICY "Users can view test case statuses" ON public.test_case_statuses FOR SELECT USING (true);
CREATE POLICY "Users can manage test case statuses" ON public.test_case_statuses FOR ALL USING (true);

-- RLS Policies for test_case_priorities
CREATE POLICY "Users can view test case priorities" ON public.test_case_priorities FOR SELECT USING (true);
CREATE POLICY "Users can manage test case priorities" ON public.test_case_priorities FOR ALL USING (true);

-- RLS Policies for test_run_statuses
CREATE POLICY "Users can view test run statuses" ON public.test_run_statuses FOR SELECT USING (true);
CREATE POLICY "Users can manage test run statuses" ON public.test_run_statuses FOR ALL USING (true);

-- RLS Policies for test_field_configurations
CREATE POLICY "Users can view test field configs" ON public.test_field_configurations FOR SELECT USING (true);
CREATE POLICY "Users can manage test field configs" ON public.test_field_configurations FOR ALL USING (true);

-- Insert default case statuses
INSERT INTO public.test_case_statuses (name, viewable_by_owner_only, eligible_for_cycle_set, eligible_for_linked_step, display_order, is_default, is_system) VALUES
('Draft', true, false, false, 0, true, true),
('Under Review', false, true, true, 1, false, true),
('Published', false, true, true, 2, false, true),
('Deprecated', false, false, false, 3, false, true);

-- Insert default case priorities
INSERT INTO public.test_case_priorities (name, color, display_order, is_default) VALUES
('Critical', '#ef4444', 0, false),
('High', '#f59e0b', 1, false),
('Medium', '#3b82f6', 2, true),
('Low', '#6b7280', 3, false);

-- Insert default run statuses per Run_Statuses.doc
INSERT INTO public.test_run_statuses (name, highlight_color, status_type, execution_completed, display_order, is_system) VALUES
('Not Run', '#6b7280', 'NOT_RUN', false, 0, true),
('In Progress', '#3b82f6', 'IN_PROGRESS', false, 1, true),
('Passed', '#10b981', 'PASSED', true, 2, true),
('Failed', '#ef4444', 'FAILED', true, 3, true),
('Blocked', '#f59e0b', 'BLOCKED', false, 4, true);