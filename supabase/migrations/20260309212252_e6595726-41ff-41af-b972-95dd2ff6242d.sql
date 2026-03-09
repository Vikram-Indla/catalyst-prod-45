ALTER TABLE public.ph_ideas 
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS assigned_team TEXT,
  ADD COLUMN IF NOT EXISTS target_release_date DATE;