-- Add feature flag for weeks unit support
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read feature flags
CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert forecast weeks unit feature flag
INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES 
  ('forecast_weeks_unit', false, 'Enable team weeks and member weeks as forecast unit options'),
  ('forecast_export', false, 'Enable CSV export functionality for forecast data')
ON CONFLICT (flag_key) DO NOTHING;

-- Create index
CREATE INDEX idx_feature_flags_flag_key ON public.feature_flags(flag_key);