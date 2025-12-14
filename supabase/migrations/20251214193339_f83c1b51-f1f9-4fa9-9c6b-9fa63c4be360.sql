-- Add new scoring columns to business_requests
ALTER TABLE public.business_requests
ADD COLUMN IF NOT EXISTS score_strategic_alignment integer CHECK (score_strategic_alignment IS NULL OR (score_strategic_alignment >= 1 AND score_strategic_alignment <= 5)),
ADD COLUMN IF NOT EXISTS score_time_urgency integer CHECK (score_time_urgency IS NULL OR (score_time_urgency >= 1 AND score_time_urgency <= 5)),
ADD COLUMN IF NOT EXISTS score_resource_feasibility integer CHECK (score_resource_feasibility IS NULL OR (score_resource_feasibility >= 1 AND score_resource_feasibility <= 5)),
ADD COLUMN IF NOT EXISTS priority_tier text CHECK (priority_tier IS NULL OR priority_tier IN ('unscored', 'rejected', 'low', 'medium', 'high'));

-- Drop legacy scoring columns
ALTER TABLE public.business_requests
DROP COLUMN IF EXISTS executive_urgency,
DROP COLUMN IF EXISTS complexity_score;

-- Note: business_value column is kept and repurposed (now 1-5 scale for "Business Impact")
-- Note: business_score column is kept and repurposed (now 1.00-5.00 scale)

-- Create prioritization_config table for admin settings
CREATE TABLE IF NOT EXISTS public.prioritization_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  weight_strategic_alignment integer NOT NULL DEFAULT 30 CHECK (weight_strategic_alignment >= 0 AND weight_strategic_alignment <= 100),
  weight_business_impact integer NOT NULL DEFAULT 30 CHECK (weight_business_impact >= 0 AND weight_business_impact <= 100),
  weight_time_urgency integer NOT NULL DEFAULT 20 CHECK (weight_time_urgency >= 0 AND weight_time_urgency <= 100),
  weight_resource_feasibility integer NOT NULL DEFAULT 20 CHECK (weight_resource_feasibility >= 0 AND weight_resource_feasibility <= 100),
  threshold_rejected_min numeric NOT NULL DEFAULT 1.0,
  threshold_rejected_max numeric NOT NULL DEFAULT 2.0,
  threshold_low_min numeric NOT NULL DEFAULT 2.0,
  threshold_low_max numeric NOT NULL DEFAULT 3.0,
  threshold_medium_min numeric NOT NULL DEFAULT 3.0,
  threshold_medium_max numeric NOT NULL DEFAULT 4.0,
  threshold_high_min numeric NOT NULL DEFAULT 4.0,
  threshold_high_max numeric NOT NULL DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.prioritization_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for prioritization_config
CREATE POLICY "Admins can manage prioritization config"
  ON public.prioritization_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view prioritization config"
  ON public.prioritization_config
  FOR SELECT
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.prioritization_config IS 'Admin-configurable scoring weights and tier thresholds for business request prioritization';