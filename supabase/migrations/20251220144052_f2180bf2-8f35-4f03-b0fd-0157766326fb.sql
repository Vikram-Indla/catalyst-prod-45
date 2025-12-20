-- Add due_date column to incident_committees for committee response deadline
ALTER TABLE public.incident_committees
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;