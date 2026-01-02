-- Test Recommendations table (AI-4: Risk-Based Test Runway Recommendations)
CREATE TABLE IF NOT EXISTS public.test_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'assign_execution', 'generate_tests', 'create_defect', 'coverage_gap', 'priority_adjustment'
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'done', 'dismissed', 'in_progress'
  target_entity_type TEXT, -- 'test_case', 'test_cycle', 'story', 'feature'
  target_entity_id UUID,
  action_data JSONB, -- structured data for the action (e.g., assignee_id, test_case_ids)
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  source_metrics JSONB, -- metrics that triggered this recommendation
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  ai_action_id UUID REFERENCES public.test_ai_actions(id), -- link to provenance
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view test_recommendations"
  ON public.test_recommendations FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can insert test_recommendations"
  ON public.test_recommendations FOR INSERT
  WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update test_recommendations"
  ON public.test_recommendations FOR UPDATE
  USING (public.current_user_is_approved());

-- Traceability Findings table (AI-2: Traceability Autopilot)
CREATE TABLE IF NOT EXISTS public.traceability_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL, -- 'missing_tests', 'orphan_tests', 'coverage_gap', 'stale_mapping'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'assigned', 'resolved', 'dismissed'
  title TEXT NOT NULL,
  description TEXT,
  source_entity_type TEXT, -- 'story', 'feature', 'test_case'
  source_entity_id UUID,
  affected_items JSONB, -- list of affected work items
  recommended_action TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  linked_defect_id UUID REFERENCES public.defects(id),
  linked_task_id UUID,
  ai_action_id UUID REFERENCES public.test_ai_actions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traceability_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view traceability_findings"
  ON public.traceability_findings FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can insert traceability_findings"
  ON public.traceability_findings FOR INSERT
  WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update traceability_findings"
  ON public.traceability_findings FOR UPDATE
  USING (public.current_user_is_approved());

-- Test Narrative Reports table (AI-5: Executive Narrative Report Generator)
CREATE TABLE IF NOT EXISTS public.test_narrative_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'sprint', 'release'
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  executive_summary TEXT,
  metrics_snapshot JSONB, -- captured metrics at time of generation
  highlights JSONB, -- key achievements
  risks_and_blockers JSONB, -- issues requiring attention
  recommendations JSONB, -- next best actions
  narrative_sections JSONB, -- structured narrative content
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id),
  ai_action_id UUID REFERENCES public.test_ai_actions(id),
  export_formats TEXT[], -- ['pdf', 'html', 'markdown']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_narrative_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view test_narrative_reports"
  ON public.test_narrative_reports FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can insert test_narrative_reports"
  ON public.test_narrative_reports FOR INSERT
  WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update test_narrative_reports"
  ON public.test_narrative_reports FOR UPDATE
  USING (public.current_user_is_approved());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_recommendations_program_status ON public.test_recommendations(program_id, status);
CREATE INDEX IF NOT EXISTS idx_traceability_findings_program_status ON public.traceability_findings(program_id, status);
CREATE INDEX IF NOT EXISTS idx_test_narrative_reports_program_type ON public.test_narrative_reports(program_id, report_type);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_test_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_test_recommendations_updated_at
  BEFORE UPDATE ON public.test_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_test_recommendations_updated_at();

CREATE OR REPLACE FUNCTION public.update_traceability_findings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_traceability_findings_updated_at
  BEFORE UPDATE ON public.traceability_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_traceability_findings_updated_at();

CREATE OR REPLACE FUNCTION public.update_test_narrative_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;