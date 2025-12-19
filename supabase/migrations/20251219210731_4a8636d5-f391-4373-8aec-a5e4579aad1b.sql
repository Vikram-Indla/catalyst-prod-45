-- Create owning_teams table for admin-configurable team/group options
CREATE TABLE IF NOT EXISTS public.owning_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owning_teams ENABLE ROW LEVEL SECURITY;

-- Policies: Approved users can read, admins can manage
CREATE POLICY "Approved users can view owning teams"
  ON public.owning_teams
  FOR SELECT
  USING (public.current_user_is_approved());

CREATE POLICY "Admins can manage owning teams"
  ON public.owning_teams
  FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Seed default values
INSERT INTO public.owning_teams (name, sort_order) VALUES
  ('Delivery Operations', 1),
  ('Business', 2)
ON CONFLICT (name) DO NOTHING;

-- Add project_id column to incidents table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN project_id UUID REFERENCES public.projects(id);
    CREATE INDEX idx_incidents_project_id ON public.incidents(project_id);
  END IF;
END $$;

-- Add owning_team_id column to incidents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'owning_team_id'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN owning_team_id UUID REFERENCES public.owning_teams(id);
    CREATE INDEX idx_incidents_owning_team_id ON public.incidents(owning_team_id);
  END IF;
END $$;

-- Add service_component column (for Affected System)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'service_component'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN service_component TEXT;
  END IF;
END $$;

-- Add business_process_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'business_process_id'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN business_process_id UUID REFERENCES public.business_processes(id);
    CREATE INDEX idx_incidents_business_process_id ON public.incidents(business_process_id);
  END IF;
END $$;

-- Updated_at trigger for owning_teams
CREATE OR REPLACE FUNCTION public.update_owning_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_owning_teams_updated_at ON public.owning_teams;
CREATE TRIGGER update_owning_teams_updated_at
  BEFORE UPDATE ON public.owning_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_owning_teams_updated_at();