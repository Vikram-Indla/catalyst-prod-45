-- Add Budget fields to business_requests table
-- Section 1: Funding & Budget
ALTER TABLE public.business_requests
ADD COLUMN IF NOT EXISTS funding_status text DEFAULT 'Not Budgeted',
ADD COLUMN IF NOT EXISTS budget_year text,
ADD COLUMN IF NOT EXISTS budget_type text[],
ADD COLUMN IF NOT EXISTS approved_budget_sar numeric(15,2),
ADD COLUMN IF NOT EXISTS current_year_budget_sar numeric(15,2),
ADD COLUMN IF NOT EXISTS budget_owner_name text,
ADD COLUMN IF NOT EXISTS project_manager_user_id uuid,
ADD COLUMN IF NOT EXISTS planned_external_spend_sar numeric(15,2),
ADD COLUMN IF NOT EXISTS internal_effort_cost_sar numeric(15,2);

-- Section 2: Contract & Commercials
ALTER TABLE public.business_requests
ADD COLUMN IF NOT EXISTS contract_type text,
ADD COLUMN IF NOT EXISTS primary_vendor_name text,
ADD COLUMN IF NOT EXISTS po_numbers text[],
ADD COLUMN IF NOT EXISTS contract_start_date date,
ADD COLUMN IF NOT EXISTS contract_end_date date,
ADD COLUMN IF NOT EXISTS delivery_model text;

-- Section 3: Funding & Capacity Notes
ALTER TABLE public.business_requests
ADD COLUMN IF NOT EXISTS capacity_status text DEFAULT 'Not Assessed',
ADD COLUMN IF NOT EXISTS internal_effort_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_effort_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS funding_assumptions text,
ADD COLUMN IF NOT EXISTS capacity_risks text;

-- Add comments for documentation
COMMENT ON COLUMN public.business_requests.funding_status IS 'Budget funding status: Not Budgeted, Budget Requested, Budget Approved, Partially Budgeted, Funded from Existing Contract';
COMMENT ON COLUMN public.business_requests.budget_type IS 'Budget type array: CAPEX, OPEX, Both';
COMMENT ON COLUMN public.business_requests.contract_type IS 'Contract type: In-source, Co-source, Outsource';
COMMENT ON COLUMN public.business_requests.delivery_model IS 'Delivery model: Vendor Owns Build, Vendor Build Internal Support, Internal Build Vendor Advisory';
COMMENT ON COLUMN public.business_requests.capacity_status IS 'Capacity status: Not Assessed, Capacity Available, Capacity Constrained, Requires Additional Headcount / Vendor';