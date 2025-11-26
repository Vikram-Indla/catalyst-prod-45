-- Create objective_work_items linking table
CREATE TABLE IF NOT EXISTS public.objective_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE NOT NULL,
  work_item_id UUID REFERENCES public.features(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(objective_id, work_item_id)
);

-- Enable RLS
ALTER TABLE public.objective_work_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated users to view objective work item links"
  ON public.objective_work_items FOR SELECT
  USING (true);

CREATE POLICY "Admins and program managers can manage objective work item links"
  ON public.objective_work_items FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'program_manager')
  );

-- Add index
CREATE INDEX idx_objective_work_items_objective ON public.objective_work_items(objective_id);
CREATE INDEX idx_objective_work_items_work_item ON public.objective_work_items(work_item_id);