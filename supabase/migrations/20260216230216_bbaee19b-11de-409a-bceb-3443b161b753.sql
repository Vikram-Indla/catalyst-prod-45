
-- 1. business_owners lookup table
CREATE TABLE public.business_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read business_owners" ON public.business_owners FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage business_owners" ON public.business_owners FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. business_requests (core demand table — 60+ fields)
CREATE TABLE public.business_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  complexity TEXT,
  urgency TEXT,
  track TEXT,
  requestor UUID,
  assignee UUID,
  business_justification TEXT,
  department TEXT,
  department_id UUID,
  business_owner TEXT,
  business_owner_id UUID,
  product_id UUID,
  process_step TEXT NOT NULL DEFAULT 'new_request',
  health TEXT NOT NULL DEFAULT 'green',
  rank INTEGER,
  progress INTEGER NOT NULL DEFAULT 0,
  -- Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  impl_start_date TIMESTAMPTZ,
  impl_target_end_date TIMESTAMPTZ,
  delivery_platform TEXT,
  delivery_track TEXT,
  planned_quarter TEXT[],
  -- Scoring
  executive_urgency INTEGER,
  business_value INTEGER,
  complexity_score INTEGER,
  business_score INTEGER,
  priority_tier TEXT,
  is_force_ranked BOOLEAN NOT NULL DEFAULT false,
  rank_override_justification TEXT,
  -- Portfolio & Estimation
  dependencies TEXT,
  risk_rating TEXT,
  portfolio_comments TEXT,
  proposed_solution TEXT,
  estimated_effort TEXT,
  estimated_cost NUMERIC,
  integration_required BOOLEAN DEFAULT false,
  integration_systems TEXT[],
  technical_validator TEXT,
  estimation_notes TEXT,
  estimation_dependencies TEXT,
  estimation_risk_rating TEXT,
  estimated_cost_sar NUMERIC,
  approval_inputs TEXT,
  portfolio_decision TEXT,
  -- Approval
  approver_name TEXT,
  approval_date TIMESTAMPTZ,
  approval_decision TEXT,
  approved_budget_ceiling NUMERIC,
  approval_remarks TEXT,
  -- Readiness
  functional_spec_link TEXT,
  acceptance_criteria TEXT,
  jira_epic_link TEXT,
  environment_dependency TEXT,
  readiness_checklist JSONB DEFAULT '{"requirements_documented":false,"technical_design_approved":false,"resources_allocated":false,"environment_ready":false,"test_cases_prepared":false}'::jsonb,
  -- Implementation
  implementation_owner TEXT,
  key_risks_remarks TEXT,
  outcome_summary TEXT,
  qa_remarks TEXT,
  -- Support / Closure
  support_owner TEXT,
  support_remarks TEXT,
  resolution_category TEXT,
  implementation_outcome TEXT,
  -- On Hold
  on_hold_reason TEXT,
  expected_resume_date TIMESTAMPTZ,
  on_hold_comment TEXT,
  -- Budget
  funding_status TEXT,
  budget_year TEXT,
  budget_type TEXT[],
  approved_budget_sar NUMERIC,
  current_year_budget_sar NUMERIC,
  budget_owner_name TEXT,
  project_manager_user_id UUID,
  planned_external_spend_sar NUMERIC,
  internal_effort_cost_sar NUMERIC,
  contract_type TEXT,
  primary_vendor_name TEXT,
  po_numbers TEXT[],
  contract_start_date TIMESTAMPTZ,
  contract_end_date TIMESTAMPTZ,
  delivery_model TEXT,
  capacity_status TEXT,
  internal_effort_pct NUMERIC,
  vendor_effort_pct NUMERIC,
  funding_assumptions TEXT,
  capacity_risks TEXT,
  -- Metadata
  ea_review_required BOOLEAN DEFAULT false,
  end_date_locked BOOLEAN DEFAULT false,
  end_date_locked_by UUID,
  end_date_locked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read business_requests" ON public.business_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert business_requests" ON public.business_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update business_requests" ON public.business_requests FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete business_requests" ON public.business_requests FOR DELETE USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_business_requests_process_step ON public.business_requests (process_step);
CREATE INDEX idx_business_requests_deleted_at ON public.business_requests (deleted_at);
CREATE INDEX idx_business_requests_department_id ON public.business_requests (department_id);
CREATE INDEX idx_business_requests_product_id ON public.business_requests (product_id);
CREATE INDEX idx_business_requests_rank ON public.business_requests (rank);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_requests;

-- 3. business_request_audit_logs
CREATE TABLE public.business_request_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_request_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read audit logs" ON public.business_request_audit_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert audit logs" ON public.business_request_audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. business_request_links
CREATE TABLE public.business_request_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  linked_item_id UUID NOT NULL,
  linked_item_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.business_request_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read request links" ON public.business_request_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage request links" ON public.business_request_links FOR ALL USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at trigger for business_requests
CREATE OR REPLACE FUNCTION public.update_business_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_business_requests_updated_at
  BEFORE UPDATE ON public.business_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_requests_updated_at();
