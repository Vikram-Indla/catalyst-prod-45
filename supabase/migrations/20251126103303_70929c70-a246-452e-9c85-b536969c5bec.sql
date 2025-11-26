-- Gap 1: Link Features to PI Objectives
CREATE TABLE IF NOT EXISTS public.feature_pi_objective_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  pi_objective_id UUID NOT NULL REFERENCES public.pi_objectives(id) ON DELETE CASCADE,
  contribution_pct NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feature_id, pi_objective_id)
);

-- RLS for feature_pi_objective_links
ALTER TABLE public.feature_pi_objective_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature PI objective links"
  ON public.feature_pi_objective_links FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage feature PI objective links"
  ON public.feature_pi_objective_links FOR ALL
  USING (
    has_role(auth.uid(), 'program_manager') AND
    EXISTS (
      SELECT 1 FROM public.features f
      WHERE f.id = feature_id AND user_in_program(auth.uid(), f.program_id)
    )
  );

CREATE POLICY "Users can view feature PI objective links"
  ON public.feature_pi_objective_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.features f
      WHERE f.id = feature_id AND user_in_program(auth.uid(), f.program_id)
    )
  );

-- Gap 2: Reports metadata
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'planning', 'execution', 'predictability', 'flow'
  report_type TEXT NOT NULL, -- 'chart', 'table', 'dashboard'
  config_json JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view reports"
  ON public.report_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage reports"
  ON public.report_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Gap 10: Predictability metrics
CREATE TABLE IF NOT EXISTS public.predictability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  planned_bv INTEGER DEFAULT 0,
  actual_bv INTEGER DEFAULT 0,
  planned_features INTEGER DEFAULT 0,
  completed_features INTEGER DEFAULT 0,
  predictability_score NUMERIC,
  commitment_reliability NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pi_id, program_id)
);

ALTER TABLE public.predictability_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view predictability metrics"
  ON public.predictability_metrics FOR SELECT
  USING (user_in_program(auth.uid(), program_id));

CREATE POLICY "Admins and program managers can manage predictability metrics"
  ON public.predictability_metrics FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    (has_role(auth.uid(), 'program_manager') AND user_in_program(auth.uid(), program_id))
  );

-- Gap 6: Value Stream metrics
CREATE TABLE IF NOT EXISTS public.value_stream_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  lead_time_days NUMERIC,
  cycle_time_days NUMERIC,
  throughput INTEGER,
  wip_count INTEGER,
  flow_efficiency NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portfolio_id, metric_date)
);

ALTER TABLE public.value_stream_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view value stream metrics"
  ON public.value_stream_metrics FOR SELECT
  USING (user_in_portfolio(auth.uid(), portfolio_id));

CREATE POLICY "Admins can manage value stream metrics"
  ON public.value_stream_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Gap 9: Enhanced dependency tracking
ALTER TABLE public.dependencies
ADD COLUMN IF NOT EXISTS criticality_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_plan TEXT,
ADD COLUMN IF NOT EXISTS blocked_days INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_pi_objective_links_feature ON public.feature_pi_objective_links(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_pi_objective_links_objective ON public.feature_pi_objective_links(pi_objective_id);
CREATE INDEX IF NOT EXISTS idx_predictability_metrics_pi ON public.predictability_metrics(pi_id);
CREATE INDEX IF NOT EXISTS idx_value_stream_metrics_portfolio ON public.value_stream_metrics(portfolio_id);

-- Trigger for updated_at
CREATE TRIGGER update_report_definitions_updated_at
  BEFORE UPDATE ON public.report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictability_metrics_updated_at
  BEFORE UPDATE ON public.predictability_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();