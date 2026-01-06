-- Defect Column Preferences Table
CREATE TABLE public.defect_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  columns JSONB NOT NULL DEFAULT '["key","summary","status","severity","priority","assignee","created_at","age"]',
  column_widths JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.defect_column_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
ON public.defect_column_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.defect_column_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.defect_column_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON public.defect_column_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update timestamps
CREATE TRIGGER update_defect_column_preferences_updated_at
  BEFORE UPDATE ON public.defect_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();