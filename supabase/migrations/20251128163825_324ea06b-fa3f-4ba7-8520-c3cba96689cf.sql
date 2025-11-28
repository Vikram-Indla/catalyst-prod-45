-- OKR Module Database Schema
-- Extends existing objectives and key_results_v2 tables

-- ============================================
-- EXTEND OBJECTIVES TABLE
-- ============================================
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_key_result_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS target_anchor_sprint_id UUID,
  ADD COLUMN IF NOT EXISTS program_increment_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contributors UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS score NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS confidence_note TEXT,
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_progress NUMERIC(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS key_result_progress NUMERIC(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS objective_type TEXT,
  ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.strategic_themes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add foreign key for parent_key_result_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_objectives_parent_key_result'
  ) THEN
    ALTER TABLE public.objectives 
      ADD CONSTRAINT fk_objectives_parent_key_result 
      FOREIGN KEY (parent_key_result_id) 
      REFERENCES public.key_results_v2(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- EXTEND KEY RESULTS V2 TABLE
-- ============================================
ALTER TABLE public.key_results_v2 
  ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'numeric',
  ADD COLUMN IF NOT EXISTS baseline_value NUMERIC,
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS score NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS score_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_checkin_at TIMESTAMPTZ;

-- Set defaults for existing rows
UPDATE public.key_results_v2 
SET target_value = 100 
WHERE target_value IS NULL;

-- ============================================
-- KEY RESULT CHECK-INS
-- ============================================
CREATE TABLE IF NOT EXISTS public.key_result_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES public.key_results_v2(id) ON DELETE CASCADE,
  checkin_date TIMESTAMPTZ DEFAULT NOW(),
  previous_value NUMERIC,
  new_value NUMERIC NOT NULL,
  note TEXT,
  score_at_checkin NUMERIC(3, 2),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALIGNED WORK LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.objective_feature_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(objective_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.objective_capability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(objective_id, capability_id)
);

CREATE TABLE IF NOT EXISTS public.objective_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  dependency_id UUID NOT NULL REFERENCES public.dependencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(objective_id, dependency_id)
);

CREATE TABLE IF NOT EXISTS public.objective_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(objective_id, risk_id)
);

CREATE TABLE IF NOT EXISTS public.objective_impediments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  impediment_id UUID NOT NULL REFERENCES public.impediments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(objective_id, impediment_id)
);

-- ============================================
-- LINKED ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.objective_linked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'external',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_objectives_tier ON public.objectives(tier);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON public.objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_portfolio_id ON public.objectives(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_objectives_program_id ON public.objectives(program_id);
CREATE INDEX IF NOT EXISTS idx_objectives_team_id ON public.objectives(team_id);
CREATE INDEX IF NOT EXISTS idx_objectives_parent_objective_id ON public.objectives(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_key_result_checkins_kr_id ON public.key_result_checkins(key_result_id);
CREATE INDEX IF NOT EXISTS idx_objective_feature_links_obj_id ON public.objective_feature_links(objective_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.key_result_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_feature_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_capability_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_impediments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_linked_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view checkins" ON public.key_result_checkins FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to create checkins" ON public.key_result_checkins FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete checkins" ON public.key_result_checkins FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to manage feature links" ON public.objective_feature_links FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to manage capability links" ON public.objective_capability_links FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to manage dependency links" ON public.objective_dependencies FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to manage risk links" ON public.objective_risks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to manage impediment links" ON public.objective_impediments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to manage linked items" ON public.objective_linked_items FOR ALL USING (auth.uid() IS NOT NULL);