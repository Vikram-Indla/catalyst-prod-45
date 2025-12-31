-- ═══════════════════════════════════════════════════════════════
-- ASSIGNMENTS TABLE
-- Links users to projects with allocation percentages
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  allocation_percentage INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  work_item_type TEXT NOT NULL DEFAULT 'project',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add constraints
ALTER TABLE public.assignments ADD CONSTRAINT assignments_allocation_check 
  CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);
ALTER TABLE public.assignments ADD CONSTRAINT assignments_status_check 
  CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));
ALTER TABLE public.assignments ADD CONSTRAINT assignments_work_item_type_check 
  CHECK (work_item_type IN ('project', 'epic', 'feature', 'story'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON public.assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON public.assignments(start_date, end_date);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all assignments" ON public.assignments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert assignments" ON public.assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update assignments" ON public.assignments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete assignments" ON public.assignments
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Real-time subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;

-- ═══════════════════════════════════════════════════════════════
-- SCENARIOS TABLE
-- Capacity planning scenarios for what-if analysis
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.capacity_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  time_scope TEXT NOT NULL DEFAULT 'quarter',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  baseline_snapshot JSONB,
  modifications JSONB,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ
);

-- Add constraints
ALTER TABLE public.capacity_scenarios ADD CONSTRAINT scenarios_status_check 
  CHECK (status IN ('draft', 'active', 'approved', 'archived'));
ALTER TABLE public.capacity_scenarios ADD CONSTRAINT scenarios_time_scope_check 
  CHECK (time_scope IN ('month', 'quarter', 'half_year', 'year'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON public.capacity_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON public.capacity_scenarios(created_by);

-- Enable RLS
ALTER TABLE public.capacity_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all scenarios" ON public.capacity_scenarios
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage scenarios" ON public.capacity_scenarios
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Real-time subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.capacity_scenarios;

-- ═══════════════════════════════════════════════════════════════
-- AI INTEGRATION SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_integration_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'mock',
  api_key_encrypted TEXT,
  model TEXT,
  endpoint_url TEXT,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Add constraint
ALTER TABLE public.ai_integration_settings ADD CONSTRAINT ai_provider_check 
  CHECK (provider IN ('mock', 'openai', 'anthropic', 'azure', 'lovable'));

-- Only one active config allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_settings_active ON public.ai_integration_settings(is_active) WHERE is_active = true;

-- Enable RLS (admin only)
ALTER TABLE public.ai_integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI settings" ON public.ai_integration_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage AI settings" ON public.ai_integration_settings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- UPDATE TRIGGER FUNCTION (if not exists)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_capacity_updated_at();

CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON public.capacity_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_capacity_updated_at();

CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON public.ai_integration_settings
  FOR EACH ROW EXECUTE FUNCTION update_capacity_updated_at();