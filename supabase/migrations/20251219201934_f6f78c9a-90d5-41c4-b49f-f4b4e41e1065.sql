-- Create incident_teams table for team/group dropdown configuration
CREATE TABLE IF NOT EXISTS public.incident_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add team_id column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.incident_teams(id);

-- Enable RLS
ALTER TABLE public.incident_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_teams - approved users can view
CREATE POLICY "Approved users can view incident teams" 
ON public.incident_teams FOR SELECT 
USING (current_user_is_approved());

-- Only admins can manage teams
CREATE POLICY "Admins can insert incident teams" 
ON public.incident_teams FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update incident teams" 
ON public.incident_teams FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete incident teams" 
ON public.incident_teams FOR DELETE 
USING (is_admin(auth.uid()));

-- Seed default teams
INSERT INTO public.incident_teams (name, description, sort_order) 
VALUES 
  ('Delivery Operations', 'Delivery and operations team', 1),
  ('Business', 'Business stakeholders team', 2)
ON CONFLICT (name) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_incident_teams_updated_at
BEFORE UPDATE ON public.incident_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();