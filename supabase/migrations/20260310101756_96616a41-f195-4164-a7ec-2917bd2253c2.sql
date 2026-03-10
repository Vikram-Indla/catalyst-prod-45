CREATE TABLE IF NOT EXISTS public.ai_integration_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'mock',
  api_key_encrypted TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 4096,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view AI settings" ON public.ai_integration_settings;
DROP POLICY IF EXISTS "Admins can manage AI settings" ON public.ai_integration_settings;

CREATE POLICY "Admins can view AI settings" ON public.ai_integration_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage AI settings" ON public.ai_integration_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));