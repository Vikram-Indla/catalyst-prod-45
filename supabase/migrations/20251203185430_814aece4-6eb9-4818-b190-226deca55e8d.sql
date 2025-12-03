-- Create epic_acceptance_criteria table for storing acceptance criteria
CREATE TABLE public.epic_acceptance_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_met BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.epic_acceptance_criteria ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Users can view acceptance criteria" 
ON public.epic_acceptance_criteria 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Users can create acceptance criteria" 
ON public.epic_acceptance_criteria 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Users can update acceptance criteria" 
ON public.epic_acceptance_criteria 
FOR UPDATE 
USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Users can delete acceptance criteria" 
ON public.epic_acceptance_criteria 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_epic_acceptance_criteria_epic_id ON public.epic_acceptance_criteria(epic_id);