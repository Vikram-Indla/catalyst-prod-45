-- Add start_date column to stories table for proper task scheduling
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add index for better query performance on date range queries
CREATE INDEX IF NOT EXISTS idx_stories_start_date ON public.stories (start_date);