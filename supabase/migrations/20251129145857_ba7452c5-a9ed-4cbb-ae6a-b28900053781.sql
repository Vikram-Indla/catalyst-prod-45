-- Add missing columns to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS allocation_percentage integer DEFAULT 100 CHECK (allocation_percentage >= 1 AND allocation_percentage <= 100),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();