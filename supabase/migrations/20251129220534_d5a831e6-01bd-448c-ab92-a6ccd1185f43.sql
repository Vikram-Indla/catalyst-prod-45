-- Remove capability_id foreign key from features table
ALTER TABLE public.features DROP COLUMN IF EXISTS capability_id;

-- Drop capabilities table
DROP TABLE IF EXISTS public.capabilities CASCADE;