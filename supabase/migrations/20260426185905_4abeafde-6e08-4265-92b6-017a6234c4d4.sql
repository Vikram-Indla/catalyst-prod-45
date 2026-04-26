
CREATE TABLE IF NOT EXISTS public.project_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  strategic_alignment integer CHECK (strategic_alignment BETWEEN 1 AND 5),
  business_impact integer CHECK (business_impact BETWEEN 1 AND 5),
  time_urgency integer CHECK (time_urgency BETWEEN 1 AND 5),
  resource_feasibility integer CHECK (resource_feasibility BETWEEN 1 AND 5),
  computed_score numeric(3,1) GENERATED ALWAYS AS (
    ROUND((
      COALESCE(strategic_alignment, 0) +
      COALESCE(business_impact, 0) +
      COALESCE(time_urgency, 0) +
      COALESCE(resource_feasibility, 0)
    )::numeric / 4.0, 1)
  ) STORED,
  scored_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view project_scores"
  ON public.project_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert project_scores"
  ON public.project_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can update project_scores"
  ON public.project_scores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can delete project_scores"
  ON public.project_scores FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_project_scores_project_id ON public.project_scores(project_id);

CREATE TRIGGER update_project_scores_updated_at
BEFORE UPDATE ON public.project_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
