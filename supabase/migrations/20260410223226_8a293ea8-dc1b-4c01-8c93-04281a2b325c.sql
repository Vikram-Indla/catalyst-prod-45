CREATE TABLE public.user_table_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_key TEXT NOT NULL,
  column_order TEXT[] DEFAULT '{}',
  column_widths JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_key)
);

ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own table preferences"
  ON public.user_table_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own table preferences"
  ON public.user_table_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own table preferences"
  ON public.user_table_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own table preferences"
  ON public.user_table_preferences FOR DELETE
  USING (auth.uid() = user_id);