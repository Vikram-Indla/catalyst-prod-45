-- Add RID column to profiles table
-- RID is a 3-digit unique resource identifier starting from 001

-- Add the rid column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rid TEXT UNIQUE;

-- Create a sequence for auto-generating RID numbers
CREATE SEQUENCE IF NOT EXISTS profiles_rid_seq START 1;

-- Create a function to generate 3-digit RID
CREATE OR REPLACE FUNCTION generate_rid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rid IS NULL THEN
    NEW.rid := LPAD(nextval('profiles_rid_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate RID on insert
DROP TRIGGER IF EXISTS set_profiles_rid ON public.profiles;
CREATE TRIGGER set_profiles_rid
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_rid();

-- Backfill existing profiles with RIDs based on creation order
WITH ordered_profiles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.profiles
  WHERE rid IS NULL
)
UPDATE public.profiles p
SET rid = LPAD(op.rn::text, 3, '0')
FROM ordered_profiles op
WHERE p.id = op.id;

-- Reset sequence to next available number
SELECT setval('profiles_rid_seq', COALESCE((SELECT MAX(rid::int) FROM public.profiles WHERE rid ~ '^\d+$'), 0) + 1);