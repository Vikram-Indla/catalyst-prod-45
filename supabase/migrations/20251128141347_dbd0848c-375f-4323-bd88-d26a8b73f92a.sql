-- Create milestones table for epic milestones tracking
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestones
CREATE POLICY "Users can view milestones in their portfolio"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.epics e
      WHERE e.id = milestones.epic_id
      AND (
        auth.uid() IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can create milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.epics e
      WHERE e.id = milestones.epic_id
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can update milestones"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.epics e
      WHERE e.id = milestones.epic_id
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can delete milestones"
  ON public.milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.epics e
      WHERE e.id = milestones.epic_id
      AND auth.uid() IS NOT NULL
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();