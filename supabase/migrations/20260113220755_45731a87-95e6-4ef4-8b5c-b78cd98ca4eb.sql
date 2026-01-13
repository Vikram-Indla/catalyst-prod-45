-- Add lead_id column to teams table for workstream lead assignment
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_lead_id ON public.teams(lead_id);

-- Add comment for documentation
COMMENT ON COLUMN public.teams.lead_id IS 'The user ID of the workstream lead';