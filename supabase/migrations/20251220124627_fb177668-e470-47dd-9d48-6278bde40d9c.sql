-- Add configurable SLA settings for at-risk threshold and major incident override
ALTER TABLE public.sla_configs 
ADD COLUMN IF NOT EXISTS at_risk_threshold_percent integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS description text;

-- Create table for global SLA settings (major incident SLA, etc.)
CREATE TABLE IF NOT EXISTS public.sla_global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.sla_global_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for sla_global_settings
CREATE POLICY "Anyone can view SLA global settings" 
  ON public.sla_global_settings FOR SELECT 
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can update SLA global settings" 
  ON public.sla_global_settings FOR UPDATE 
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can insert SLA global settings" 
  ON public.sla_global_settings FOR INSERT 
  WITH CHECK (public.is_user_admin(auth.uid()));

-- Insert default global settings
INSERT INTO public.sla_global_settings (setting_key, setting_value, description)
VALUES 
  ('major_incident_sla_minutes', '{"value": 240}'::jsonb, 'SLA target for major incidents (in minutes). Default: 4 hours = 240 minutes'),
  ('at_risk_threshold_percent', '{"value": 20}'::jsonb, 'Percentage of remaining SLA time at which incident becomes "At Risk". Default: 20%')
ON CONFLICT (setting_key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_sla_global_settings_updated_at
  BEFORE UPDATE ON public.sla_global_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();