
-- Create task_labels table for reusable labels
CREATE TABLE IF NOT EXISTS public.task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gray',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_label_assignments junction table
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);

-- Enable RLS
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_labels (labels are global)
CREATE POLICY "Labels are viewable by authenticated users" 
ON public.task_labels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Labels can be created by authenticated users" 
ON public.task_labels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Labels can be updated by authenticated users" 
ON public.task_labels FOR UPDATE TO authenticated USING (true);

-- RLS Policies for task_label_assignments
CREATE POLICY "Label assignments are viewable by authenticated users" 
ON public.task_label_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Label assignments can be created by authenticated users" 
ON public.task_label_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Label assignments can be deleted by authenticated users" 
ON public.task_label_assignments FOR DELETE TO authenticated USING (true);

-- Insert default labels
INSERT INTO public.task_labels (name, color) VALUES 
  ('Bug', 'red'),
  ('Feature', 'blue'),
  ('Enhancement', 'purple'),
  ('Documentation', 'green'),
  ('Urgent', 'orange'),
  ('Low Priority', 'gray')
ON CONFLICT (name) DO NOTHING;
