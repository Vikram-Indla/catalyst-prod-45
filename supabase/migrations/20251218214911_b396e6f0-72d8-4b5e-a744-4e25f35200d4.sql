-- CAP Committee Policy Configuration
CREATE TABLE IF NOT EXISTS public.cap_committee_policy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_mode TEXT NOT NULL DEFAULT 'majority' CHECK (approval_mode IN ('majority', 'unanimous')),
  veto_enabled BOOLEAN NOT NULL DEFAULT true,
  justification_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Default CAP Committee Members
CREATE TABLE IF NOT EXISTS public.cap_committee_default_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT,
  has_veto BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversion Rules Configuration
CREATE TABLE IF NOT EXISTS public.incident_conversion_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allowed_statuses TEXT[] NOT NULL DEFAULT ARRAY['open', 'in_progress', 'on_hold'],
  allowed_target_types TEXT[] NOT NULL DEFAULT ARRAY['story', 'feature', 'epic', 'business_request'],
  auto_lock_after_conversion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- SLA Pause Conditions
CREATE TABLE IF NOT EXISTS public.sla_pause_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('status', 'committee')),
  condition_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Incident Field Options (for configurable dropdowns)
CREATE TABLE IF NOT EXISTS public.incident_field_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL CHECK (field_name IN ('severity', 'impact', 'urgency', 'priority', 'source_department', 'delivery_platform')),
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_name, option_value)
);

-- Enable RLS
ALTER TABLE public.cap_committee_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_committee_default_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_conversion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_pause_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_field_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for read access (all authenticated users can read)
CREATE POLICY "Authenticated users can read cap_committee_policy" ON public.cap_committee_policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cap_committee_default_members" ON public.cap_committee_default_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read incident_conversion_rules" ON public.incident_conversion_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read sla_pause_conditions" ON public.sla_pause_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read incident_field_options" ON public.incident_field_options FOR SELECT TO authenticated USING (true);

-- RLS Policies for admin write access
CREATE POLICY "Admins can manage cap_committee_policy" ON public.cap_committee_policy FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage cap_committee_default_members" ON public.cap_committee_default_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage incident_conversion_rules" ON public.incident_conversion_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage sla_pause_conditions" ON public.sla_pause_conditions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage incident_field_options" ON public.incident_field_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default CAP committee policy
INSERT INTO public.cap_committee_policy (approval_mode, veto_enabled, justification_required)
VALUES ('majority', true, true)
ON CONFLICT DO NOTHING;

-- Insert default conversion rules
INSERT INTO public.incident_conversion_rules (allowed_statuses, allowed_target_types, auto_lock_after_conversion)
VALUES (ARRAY['open', 'in_progress', 'on_hold'], ARRAY['story', 'feature', 'epic', 'business_request'], true)
ON CONFLICT DO NOTHING;

-- Insert default SLA pause conditions
INSERT INTO public.sla_pause_conditions (condition_type, condition_value, description, is_active) VALUES
('status', 'on_hold', 'Pause SLA when incident is on hold', true),
('committee', 'pending', 'Pause SLA when waiting for CAP Committee approval', true);

-- Insert default field options for Severity (matching enum values)
INSERT INTO public.incident_field_options (field_name, option_value, option_label, color, sort_order) VALUES
('severity', 'SEV1', 'SEV1 - Critical', '#DC2626', 1),
('severity', 'SEV2', 'SEV2 - Major', '#EA580C', 2),
('severity', 'SEV3', 'SEV3 - Moderate', '#CA8A04', 3),
('severity', 'SEV4', 'SEV4 - Minor', '#16A34A', 4)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Insert default field options for Impact
INSERT INTO public.incident_field_options (field_name, option_value, option_label, color, sort_order) VALUES
('impact', 'critical', 'Critical', '#DC2626', 1),
('impact', 'high', 'High', '#EA580C', 2),
('impact', 'medium', 'Medium', '#CA8A04', 3),
('impact', 'low', 'Low', '#16A34A', 4)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Insert default field options for Urgency
INSERT INTO public.incident_field_options (field_name, option_value, option_label, color, sort_order) VALUES
('urgency', 'critical', 'Critical', '#DC2626', 1),
('urgency', 'high', 'High', '#EA580C', 2),
('urgency', 'medium', 'Medium', '#CA8A04', 3),
('urgency', 'low', 'Low', '#16A34A', 4)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Insert default field options for Priority
INSERT INTO public.incident_field_options (field_name, option_value, option_label, color, sort_order) VALUES
('priority', 'P1', 'P1 - Critical', '#DC2626', 1),
('priority', 'P2', 'P2 - High', '#EA580C', 2),
('priority', 'P3', 'P3 - Medium', '#CA8A04', 3),
('priority', 'P4', 'P4 - Low', '#16A34A', 4)
ON CONFLICT (field_name, option_value) DO NOTHING;