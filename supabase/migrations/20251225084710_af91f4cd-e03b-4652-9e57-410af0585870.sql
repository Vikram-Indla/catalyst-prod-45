-- Create epic_statuses table (matching demand_process_steps structure)
CREATE TABLE public.epic_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'olive',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create feature_statuses table (matching demand_process_steps structure)
CREATE TABLE public.feature_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'olive',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.epic_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow read for all authenticated users
CREATE POLICY "Approved users can read epic_statuses"
  ON public.epic_statuses FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Approved users can read feature_statuses"
  ON public.feature_statuses FOR SELECT
  USING (public.current_user_is_approved());

-- RLS policies - allow write for admins only
CREATE POLICY "Admins can manage epic_statuses"
  ON public.epic_statuses FOR ALL
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can manage feature_statuses"
  ON public.feature_statuses FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Seed epic_statuses with existing enum values
INSERT INTO public.epic_statuses (value, label, color, sort_order) VALUES
  ('proposed', 'Proposed', 'olive', 1),
  ('analyzing', 'Analyzing', 'amber', 2),
  ('approved', 'Approved', 'forest', 3),
  ('in_progress', 'In Progress', 'sapphire', 4),
  ('done', 'Done', 'forest', 5),
  ('cancelled', 'Cancelled', 'stone', 6);

-- Seed feature_statuses with existing enum values
INSERT INTO public.feature_statuses (value, label, color, sort_order) VALUES
  ('funnel', 'Funnel', 'olive', 1),
  ('analyzing', 'Analyzing', 'amber', 2),
  ('backlog', 'Backlog', 'sapphire', 3),
  ('implementing', 'Implementing', 'terracotta', 4),
  ('done', 'Done', 'forest', 5);

-- Create updated_at triggers
CREATE TRIGGER update_epic_statuses_updated_at
  BEFORE UPDATE ON public.epic_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_departments_updated_at();

CREATE TRIGGER update_feature_statuses_updated_at
  BEFORE UPDATE ON public.feature_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_departments_updated_at();