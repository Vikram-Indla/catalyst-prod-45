
-- Add FK to projects (ON DELETE CASCADE)
ALTER TABLE public.dashboard_widget_config
  ADD CONSTRAINT dashboard_widget_config_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add index for project+user lookups
CREATE INDEX IF NOT EXISTS idx_dwc_project_user ON public.dashboard_widget_config(project_id, user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_dwc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dwc_updated_at
  BEFORE UPDATE ON public.dashboard_widget_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dwc_updated_at();
