-- User preferences for JIRA module
CREATE TABLE IF NOT EXISTS public.jira_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recent_projects UUID[] DEFAULT '{}',
  recent_issues TEXT[] DEFAULT '{}',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  default_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  board_density TEXT DEFAULT 'comfortable' CHECK (board_density IN ('compact', 'comfortable', 'spacious')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_jira_prefs_user ON public.jira_user_preferences(user_id);

ALTER TABLE public.jira_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON public.jira_user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Project stars for quick access
CREATE TABLE IF NOT EXISTS public.project_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_stars_user ON public.project_stars(user_id);

ALTER TABLE public.project_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stars" ON public.project_stars
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to update recent projects
CREATE OR REPLACE FUNCTION public.update_recent_project(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_recent UUID[];
BEGIN
  -- Get current recent projects
  SELECT recent_projects INTO v_recent
  FROM public.jira_user_preferences
  WHERE user_id = v_user_id;
  
  -- If no preferences exist, create them
  IF v_recent IS NULL THEN
    INSERT INTO public.jira_user_preferences (user_id, recent_projects)
    VALUES (v_user_id, ARRAY[p_project_id]);
    RETURN;
  END IF;
  
  -- Remove project if exists, add to front, limit to 10
  v_recent := array_remove(v_recent, p_project_id);
  v_recent := p_project_id || v_recent;
  v_recent := v_recent[1:10];
  
  -- Update preferences
  UPDATE public.jira_user_preferences
  SET recent_projects = v_recent, updated_at = NOW()
  WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;