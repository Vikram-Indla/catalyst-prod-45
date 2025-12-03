
-- Create business_requests table with all fields for 9 tabs
CREATE TABLE public.business_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Overview Tab Fields
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT, -- Web, Mobile, API, Integration, Infrastructure
  complexity TEXT, -- Low, Medium, High, Very High
  urgency TEXT, -- Low, Normal, High, Critical
  track TEXT, -- Digital, Core Banking, Payments, Analytics, Infrastructure
  requestor TEXT,
  business_justification TEXT,
  start_date DATE,
  end_date DATE,
  
  -- Process & Health (Global)
  process_step TEXT DEFAULT 'new_demand', -- new_demand, portfolio_review, technical_validation, estimate, demand_approved, ready_for_development, under_implementation, implementation_review, in_support_done, on_hold_cancel
  health TEXT DEFAULT 'green', -- green, amber, red
  
  -- Portfolio Tab Fields
  dependencies TEXT,
  risk_rating TEXT, -- Low, Medium, High, Critical
  portfolio_comments TEXT,
  delivery_platform TEXT, -- On-Premise, Cloud, Hybrid
  delivery_track TEXT, -- Digital, Core Banking, Payments, Analytics
  
  -- Technical Tab Fields
  proposed_solution TEXT,
  estimated_effort TEXT,
  estimated_cost DECIMAL(15,2),
  integration_required BOOLEAN DEFAULT false,
  integration_systems TEXT[], -- SAP, Salesforce, Oracle, Microsoft Dynamics, Custom API, Core Banking, Payment Gateway
  technical_validator TEXT,
  
  -- Estimation Tab Fields
  estimation_notes TEXT,
  estimation_dependencies TEXT,
  estimation_risk_rating TEXT,
  estimated_cost_sar DECIMAL(15,2),
  approval_inputs TEXT,
  portfolio_decision TEXT, -- Pending, Approve, Reject, Defer, Need More Info
  
  -- Approval Tab Fields
  approver_name TEXT,
  approval_date DATE,
  approval_decision TEXT, -- Approved, Rejected, Deferred, Conditionally Approved
  approved_budget_ceiling DECIMAL(15,2),
  approval_remarks TEXT,
  
  -- Readiness Tab Fields
  functional_spec_link TEXT,
  acceptance_criteria TEXT,
  jira_epic_link TEXT,
  environment_dependency TEXT, -- Development, QA, UAT, Pre-Production, Production
  readiness_checklist JSONB DEFAULT '{"requirements_documented": false, "technical_design_approved": false, "resources_allocated": false, "environment_ready": false, "test_cases_prepared": false}'::jsonb,
  
  -- Implementation Tab Fields
  implementation_owner TEXT,
  impl_start_date DATE,
  impl_target_end_date DATE,
  key_risks_remarks TEXT,
  outcome_summary TEXT,
  qa_remarks TEXT,
  
  -- Support Tab Fields
  support_owner TEXT,
  support_remarks TEXT,
  resolution_category TEXT, -- Completed Successfully, Partially Completed, Cancelled, Rolled Back
  implementation_outcome TEXT, -- Live in Production, Pending Go-Live, Failed, Decommissioned
  
  -- On Hold Tab Fields
  on_hold_reason TEXT,
  expected_resume_date DATE,
  on_hold_comment TEXT,
  
  -- Metadata
  request_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to all authenticated users" 
ON public.business_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.business_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.business_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.business_requests 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_business_requests_updated_at
BEFORE UPDATE ON public.business_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for request key
CREATE SEQUENCE IF NOT EXISTS business_request_key_seq START 1;

-- Function to generate request key
CREATE OR REPLACE FUNCTION generate_business_request_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_key := 'BR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('business_request_key_seq')::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate request key
CREATE TRIGGER set_business_request_key
BEFORE INSERT ON public.business_requests
FOR EACH ROW
WHEN (NEW.request_key IS NULL)
EXECUTE FUNCTION generate_business_request_key();

-- Insert seed data
INSERT INTO public.business_requests (title, description, platform, complexity, urgency, track, requestor, business_justification, process_step, health, start_date, end_date) VALUES
('Advanced Payment Gateway Integration', 'Integrate new payment gateway for enhanced transaction processing', 'API', 'High', 'High', 'Payments', 'Ahmed Al-Rashid', 'Critical for expanding payment options and improving transaction success rates', 'demand_approved', 'green', '2024-04-01', '2024-07-31'),
('Advanced Voice Activation for Transactions', 'Enable voice-based transaction initiation for mobile app', 'Mobile', 'Very High', 'Normal', 'Digital', 'Sarah Johnson', 'Improve accessibility and user experience', 'portfolio_review', 'amber', NULL, NULL),
('AI for Improved Call Center Interactions', 'Implement AI-powered call routing and response system', 'Integration', 'High', 'High', 'Digital', 'Mohammed Ali', 'Reduce call handling time by 40%', 'under_implementation', 'green', NULL, NULL),
('AI-Powered Recommendations', 'Build recommendation engine for personalized offers', 'Web', 'Medium', 'Normal', 'Analytics', 'Fatima Hassan', 'Increase cross-sell conversion by 25%', 'new_demand', 'green', NULL, NULL),
('Android App Redesign & Modernization', 'Complete redesign of Android mobile banking app', 'Mobile', 'Very High', 'Critical', 'Digital', 'Omar Khalid', 'Modernize UI/UX to match iOS app standards', 'under_implementation', 'green', '2024-01-15', '2024-06-30'),
('API Gateway Implementation', 'Centralized API gateway for microservices', 'Infrastructure', 'High', 'Normal', 'Infrastructure', 'Yousef Ahmed', 'Improve API security and monitoring', 'new_demand', 'amber', NULL, NULL),
('API v2 Implementation', 'New version of public API with enhanced features', 'API', 'Medium', 'Low', 'Digital', 'Layla Ibrahim', 'Support new partner integrations', 'new_demand', 'green', '2025-10-01', '2025-12-31'),
('AWS Cloud Migration - Phase 1', 'Migrate core banking services to AWS', 'Infrastructure', 'Very High', 'High', 'Infrastructure', 'Khalid Mansour', 'Reduce infrastructure costs by 30%', 'under_implementation', 'green', '2024-01-01', '2024-09-30');
