-- Add module_access column to profiles if missing (staging schema gap)
-- Production already has this column; staging diverged.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS module_access jsonb DEFAULT NULL;
