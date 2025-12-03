-- Create junction table for additional programs on epics
CREATE TABLE IF NOT EXISTS public.epic_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(epic_id, program_id)
);

-- Enable RLS
ALTER TABLE public.epic_programs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading
CREATE POLICY "Allow read access to epic_programs" 
ON public.epic_programs 
FOR SELECT 
USING (true);

-- Create policy for insert
CREATE POLICY "Allow insert to epic_programs" 
ON public.epic_programs 
FOR INSERT 
WITH CHECK (true);

-- Create policy for delete
CREATE POLICY "Allow delete on epic_programs" 
ON public.epic_programs 
FOR DELETE 
USING (true);