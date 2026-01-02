-- Create test_ai_settings table for AI governance per project
CREATE TABLE public.test_ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  api_key_ref TEXT, -- Reference to secret, not raw key
  confidence_threshold NUMERIC DEFAULT 0.7,
  auto_approve BOOLEAN DEFAULT false,
  prompt_templates_json JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(program_id)
);

-- Create test_ai_actions table for provenance tracking
CREATE TABLE public.test_ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'test_case', 'test_step', 'test_set', etc.
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'generate', 'suggest', 'analyze', 'convert'
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT, -- SHA256 of the prompt for reproducibility
  input_sources JSONB, -- References to input data used
  confidence NUMERIC, -- Model confidence if available
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  output_summary_json JSONB, -- Summary of what was generated
  tokens_used INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_ai_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_ai_settings
CREATE POLICY "Users can view AI settings" ON public.test_ai_settings
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage AI settings" ON public.test_ai_settings
  FOR ALL USING (public.is_user_admin(auth.uid()));

-- RLS policies for test_ai_actions (provenance is viewable by all approved users)
CREATE POLICY "Users can view AI actions" ON public.test_ai_actions
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Users can insert AI actions" ON public.test_ai_actions
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Users can update own AI actions" ON public.test_ai_actions
  FOR UPDATE USING (created_by = auth.uid() OR public.is_user_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_test_ai_settings_program ON public.test_ai_settings(program_id);
CREATE INDEX idx_test_ai_actions_program ON public.test_ai_actions(program_id);
CREATE INDEX idx_test_ai_actions_entity ON public.test_ai_actions(entity_type, entity_id);
CREATE INDEX idx_test_ai_actions_created ON public.test_ai_actions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_test_ai_settings_updated_at
  BEFORE UPDATE ON public.test_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_incident_updated_at();