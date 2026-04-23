CREATE TABLE IF NOT EXISTS public.gadget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gadget_key TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, gadget_key)
);

ALTER TABLE public.gadget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gadget settings"
  ON public.gadget_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own gadget settings"
  ON public.gadget_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own gadget settings"
  ON public.gadget_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own gadget settings"
  ON public.gadget_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.gadget_settings_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gadget_settings_updated_at ON public.gadget_settings;
CREATE TRIGGER trg_gadget_settings_updated_at
  BEFORE UPDATE ON public.gadget_settings
  FOR EACH ROW EXECUTE FUNCTION public.gadget_settings_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_gadget_settings_user_gadget
  ON public.gadget_settings (user_id, gadget_key);