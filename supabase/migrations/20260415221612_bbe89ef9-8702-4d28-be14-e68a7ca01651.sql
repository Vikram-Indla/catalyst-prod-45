
-- Create kanban view settings table
CREATE TABLE public.kanban_view_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL,
  open_in_sidebar BOOLEAN NOT NULL DEFAULT false,
  show_quick_filters BOOLEAN NOT NULL DEFAULT false,
  show_work_suggestions BOOLEAN NOT NULL DEFAULT true,
  visible_fields JSONB NOT NULL DEFAULT '{"cardCover":true,"workType":true,"workItemKey":true,"epic":true,"linkedWorkItems":false,"priority":true,"assignee":true,"fixVersions":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_key)
);

-- Enable RLS
ALTER TABLE public.kanban_view_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own settings
CREATE POLICY "Users can view their own kanban view settings"
  ON public.kanban_view_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can create their own kanban view settings"
  ON public.kanban_view_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own kanban view settings"
  ON public.kanban_view_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_kanban_view_settings_updated_at
  BEFORE UPDATE ON public.kanban_view_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
