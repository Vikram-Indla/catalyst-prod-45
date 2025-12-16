-- Remove program_increment_id column from risks table
ALTER TABLE public.risks DROP COLUMN IF EXISTS program_increment_id;

-- Also remove pi_id if it exists as an alias
ALTER TABLE public.risks DROP COLUMN IF EXISTS pi_id;