
CREATE TABLE IF NOT EXISTS public.dashboard_widget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  widget_id text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, widget_id)
);

ALTER TABLE public.dashboard_widget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own widget config"
  ON public.dashboard_widget_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own widget config"
  ON public.dashboard_widget_config FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own widget config"
  ON public.dashboard_widget_config FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own widget config"
  ON public.dashboard_widget_config FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
