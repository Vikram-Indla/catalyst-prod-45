-- Enhance features table with Jira Align standard fields
-- Source: https://help.jiraalign.com/hc/en-us/articles/115005897448-Create-features
-- Source: https://help.jiraalign.com/hc/en-us/articles/115005899568-Manage-features

-- Add planning and actual dates
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS planned_start_date DATE,
ADD COLUMN IF NOT EXISTS planned_end_date DATE,
ADD COLUMN IF NOT EXISTS actual_start_date DATE,
ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- Add WSJF components (Weighted Shortest Job First)
-- These are used to calculate wsjf_score = (business_value + time_criticality + risk_reduction) / job_size
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS business_value INTEGER CHECK (business_value >= 0 AND business_value <= 100),
ADD COLUMN IF NOT EXISTS time_criticality INTEGER CHECK (time_criticality >= 0 AND time_criticality <= 100),
ADD COLUMN IF NOT EXISTS risk_reduction INTEGER CHECK (risk_reduction >= 0 AND risk_reduction <= 100),
ADD COLUMN IF NOT EXISTS job_size INTEGER CHECK (job_size >= 0 AND job_size <= 100);

-- Add blocking and acceptance criteria
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add team assignment for cross-team features
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Create index on team_id for performance
CREATE INDEX IF NOT EXISTS idx_features_team_id ON public.features(team_id);

-- Add trigger to automatically calculate WSJF score when components change
CREATE OR REPLACE FUNCTION public.calculate_feature_wsjf()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate WSJF score: (BV + TC + RR) / JS
  -- Only calculate if all components are present and job_size > 0
  IF NEW.business_value IS NOT NULL 
     AND NEW.time_criticality IS NOT NULL 
     AND NEW.risk_reduction IS NOT NULL 
     AND NEW.job_size IS NOT NULL 
     AND NEW.job_size > 0 THEN
    NEW.wsjf_score := ROUND(
      (NEW.business_value + NEW.time_criticality + NEW.risk_reduction)::NUMERIC / NEW.job_size::NUMERIC, 
      2
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for WSJF calculation
DROP TRIGGER IF EXISTS trigger_calculate_feature_wsjf ON public.features;
CREATE TRIGGER trigger_calculate_feature_wsjf
  BEFORE INSERT OR UPDATE OF business_value, time_criticality, risk_reduction, job_size
  ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_feature_wsjf();

COMMENT ON COLUMN public.features.planned_start_date IS 'Planned start date for the feature';
COMMENT ON COLUMN public.features.planned_end_date IS 'Planned completion date for the feature';
COMMENT ON COLUMN public.features.actual_start_date IS 'Actual start date when work began';
COMMENT ON COLUMN public.features.actual_end_date IS 'Actual completion date';
COMMENT ON COLUMN public.features.business_value IS 'WSJF component: Business value (0-100)';
COMMENT ON COLUMN public.features.time_criticality IS 'WSJF component: Time criticality (0-100)';
COMMENT ON COLUMN public.features.risk_reduction IS 'WSJF component: Risk reduction/opportunity enablement (0-100)';
COMMENT ON COLUMN public.features.job_size IS 'WSJF component: Relative job size (0-100)';
COMMENT ON COLUMN public.features.blocked IS 'Whether the feature is currently blocked';
COMMENT ON COLUMN public.features.blocked_reason IS 'Reason for blocking if blocked is true';
COMMENT ON COLUMN public.features.acceptance_criteria IS 'Acceptance criteria for the feature';
COMMENT ON COLUMN public.features.notes IS 'Additional notes about the feature';
COMMENT ON COLUMN public.features.team_id IS 'Team responsible for delivering the feature';