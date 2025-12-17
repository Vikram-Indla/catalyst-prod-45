-- Rename due_date to end_date in milestones table for consistency with Objectives/Demands
ALTER TABLE public.milestones RENAME COLUMN due_date TO end_date;