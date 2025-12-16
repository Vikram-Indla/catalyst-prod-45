-- Phase C: Drop due_date columns (objectives and key_results_v2 ONLY)
-- Milestones, work items, risks are NOT touched

ALTER TABLE public.objectives DROP COLUMN IF EXISTS due_date;
ALTER TABLE public.key_results_v2 DROP COLUMN IF EXISTS due_date;