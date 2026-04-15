
-- Create catalyst_workflow_schemes
CREATE TABLE public.catalyst_workflow_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  issue_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cws_issue_type_default ON public.catalyst_workflow_schemes (issue_type) WHERE is_default = true;

ALTER TABLE public.catalyst_workflow_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow schemes"
  ON public.catalyst_workflow_schemes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflow schemes"
  ON public.catalyst_workflow_schemes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create catalyst_workflow_statuses
CREATE TABLE public.catalyst_workflow_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheme_id UUID NOT NULL REFERENCES public.catalyst_workflow_schemes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'todo' CHECK (category IN ('todo', 'in_progress', 'done')),
  color TEXT NOT NULL DEFAULT '#DFE1E6',
  position INTEGER NOT NULL DEFAULT 0,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheme_id, slug)
);

CREATE INDEX idx_cwst_scheme ON public.catalyst_workflow_statuses (scheme_id, position);

ALTER TABLE public.catalyst_workflow_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow statuses"
  ON public.catalyst_workflow_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflow statuses"
  ON public.catalyst_workflow_statuses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create catalyst_workflow_transitions
CREATE TABLE public.catalyst_workflow_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheme_id UUID NOT NULL REFERENCES public.catalyst_workflow_schemes(id) ON DELETE CASCADE,
  name TEXT,
  from_status_id UUID REFERENCES public.catalyst_workflow_statuses(id) ON DELETE CASCADE,
  to_status_id UUID NOT NULL REFERENCES public.catalyst_workflow_statuses(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cwtr_scheme ON public.catalyst_workflow_transitions (scheme_id);
CREATE INDEX idx_cwtr_from ON public.catalyst_workflow_transitions (from_status_id);
CREATE INDEX idx_cwtr_to ON public.catalyst_workflow_transitions (to_status_id);

ALTER TABLE public.catalyst_workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow transitions"
  ON public.catalyst_workflow_transitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflow transitions"
  ON public.catalyst_workflow_transitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Timestamp triggers
CREATE TRIGGER update_catalyst_workflow_schemes_updated_at
  BEFORE UPDATE ON public.catalyst_workflow_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalyst_workflow_statuses_updated_at
  BEFORE UPDATE ON public.catalyst_workflow_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalyst_workflow_transitions_updated_at
  BEFORE UPDATE ON public.catalyst_workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
