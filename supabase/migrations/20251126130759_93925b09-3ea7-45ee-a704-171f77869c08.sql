-- Create milestones table for roadmap markers
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE NOT NULL,
  state TEXT DEFAULT 'not_started',
  category TEXT DEFAULT 'general',
  milestone_type TEXT DEFAULT 'target_completion',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for milestones
CREATE POLICY "Allow authenticated users to view milestones"
  ON public.milestones FOR SELECT
  USING (true);

CREATE POLICY "Admins and program managers can manage milestones"
  ON public.milestones FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'program_manager')
  );

-- Add indexes for performance
CREATE INDEX idx_milestones_work_item ON public.milestones(work_item_id);
CREATE INDEX idx_milestones_due_date ON public.milestones(due_date);