-- Epic Design Items table
CREATE TABLE IF NOT EXISTS public.epic_design_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'file')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Epic Benefits table
CREATE TABLE IF NOT EXISTS public.epic_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT,
  target_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Epic Value Metrics table
CREATE TABLE IF NOT EXISTS public.epic_value_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL UNIQUE REFERENCES public.epics(id) ON DELETE CASCADE,
  business_value INTEGER NOT NULL DEFAULT 0 CHECK (business_value >= 0 AND business_value <= 100),
  time_criticality INTEGER NOT NULL DEFAULT 0 CHECK (time_criticality >= 0 AND time_criticality <= 100),
  risk_reduction INTEGER NOT NULL DEFAULT 0 CHECK (risk_reduction >= 0 AND risk_reduction <= 100),
  estimated_revenue NUMERIC(15, 2) DEFAULT 0,
  cost_savings NUMERIC(15, 2) DEFAULT 0,
  customer_satisfaction_impact INTEGER DEFAULT 0 CHECK (customer_satisfaction_impact >= 0 AND customer_satisfaction_impact <= 100),
  market_share_impact INTEGER DEFAULT 0 CHECK (market_share_impact >= 0 AND market_share_impact <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Epic PI Forecasts table
CREATE TABLE IF NOT EXISTS public.epic_pi_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  estimate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(epic_id, pi_id)
);

-- Epic Links table
CREATE TABLE IF NOT EXISTS public.epic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'documentation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_epic_design_items_epic_id ON public.epic_design_items(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_benefits_epic_id ON public.epic_benefits(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_value_metrics_epic_id ON public.epic_value_metrics(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_pi_forecasts_epic_id ON public.epic_pi_forecasts(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_pi_forecasts_pi_id ON public.epic_pi_forecasts(pi_id);
CREATE INDEX IF NOT EXISTS idx_epic_links_epic_id ON public.epic_links(epic_id);

-- Add updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_epic_design_items_updated_at') THEN
    CREATE TRIGGER update_epic_design_items_updated_at BEFORE UPDATE ON public.epic_design_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_epic_benefits_updated_at') THEN
    CREATE TRIGGER update_epic_benefits_updated_at BEFORE UPDATE ON public.epic_benefits
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_epic_value_metrics_updated_at') THEN
    CREATE TRIGGER update_epic_value_metrics_updated_at BEFORE UPDATE ON public.epic_value_metrics
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_epic_pi_forecasts_updated_at') THEN
    CREATE TRIGGER update_epic_pi_forecasts_updated_at BEFORE UPDATE ON public.epic_pi_forecasts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_epic_links_updated_at') THEN
    CREATE TRIGGER update_epic_links_updated_at BEFORE UPDATE ON public.epic_links
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.epic_design_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epic_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epic_value_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epic_pi_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epic_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allowing authenticated users to manage their own data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'epic_design_items' AND policyname = 'Users can manage epic design items') THEN
    CREATE POLICY "Users can manage epic design items" ON public.epic_design_items FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'epic_benefits' AND policyname = 'Users can manage epic benefits') THEN
    CREATE POLICY "Users can manage epic benefits" ON public.epic_benefits FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'epic_value_metrics' AND policyname = 'Users can manage epic value metrics') THEN
    CREATE POLICY "Users can manage epic value metrics" ON public.epic_value_metrics FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'epic_pi_forecasts' AND policyname = 'Users can manage epic forecasts') THEN
    CREATE POLICY "Users can manage epic forecasts" ON public.epic_pi_forecasts FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'epic_links' AND policyname = 'Users can manage epic links') THEN
    CREATE POLICY "Users can manage epic links" ON public.epic_links FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;