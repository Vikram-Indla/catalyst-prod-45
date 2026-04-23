CREATE TABLE IF NOT EXISTS public.user_view_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  view_key TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, view_key)
);

ALTER TABLE public.user_view_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own view prefs"
  ON public.user_view_preferences
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own view prefs"
  ON public.user_view_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own view prefs"
  ON public.user_view_preferences
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own view prefs"
  ON public.user_view_preferences
  FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user_view
  ON public.user_view_preferences(user_id, view_key);