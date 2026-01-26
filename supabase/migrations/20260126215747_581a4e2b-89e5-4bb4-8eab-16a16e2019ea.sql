-- Budget Scenarios Table for V8 Scenario Planning
-- Stores user-created budget scenarios with resource extensions

CREATE TABLE public.budget_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'preset' or 'custom'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Scenario metadata
  total_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  delta_from_baseline DECIMAL(15,2) NOT NULL DEFAULT 0,
  resource_count INTEGER NOT NULL DEFAULT 0,
  avg_extension_months DECIMAL(4,2) DEFAULT 0,
  
  -- Budget breakdown
  insourced_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  cosourced_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  outsourced_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  licenses_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Filter criteria used to create scenario
  filter_department VARCHAR(100),
  filter_expiry_start DATE,
  filter_expiry_end DATE,
  
  -- Stores individual resource extensions as JSONB
  -- Format: [{ resourceId, resourceName, department, originalEnd, extensionMonths, newEnd, deltaCost, monthlyCTC }]
  scenario_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_budget_scenarios_created_by ON public.budget_scenarios(created_by);
CREATE INDEX idx_budget_scenarios_type ON public.budget_scenarios(type);
CREATE INDEX idx_budget_scenarios_created_at ON public.budget_scenarios(created_at DESC);

-- Enable RLS
ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view all scenarios, but only edit their own
CREATE POLICY "Users can view all budget scenarios"
  ON public.budget_scenarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own scenarios"
  ON public.budget_scenarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own scenarios"
  ON public.budget_scenarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own scenarios"
  ON public.budget_scenarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_budget_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_budget_scenarios_updated_at
  BEFORE UPDATE ON public.budget_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_scenarios_updated_at();

-- Insert preset scenarios (these are calculation presets, not actual saved data)
-- Presets are computed on-the-fly based on current resource data