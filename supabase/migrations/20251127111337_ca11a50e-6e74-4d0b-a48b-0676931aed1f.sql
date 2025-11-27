-- Create labels table for custom epic labels
CREATE TABLE IF NOT EXISTS public.epic_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name)
);

-- Create junction table for epic-label relationships
CREATE TABLE IF NOT EXISTS public.epic_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.epic_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(epic_id, label_id)
);

-- Enable RLS
ALTER TABLE public.epic_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epic_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epic_labels
CREATE POLICY "Anyone can view labels"
  ON public.epic_labels FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create labels"
  ON public.epic_labels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own labels"
  ON public.epic_labels FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own labels"
  ON public.epic_labels FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for epic_label_assignments
CREATE POLICY "Anyone can view label assignments"
  ON public.epic_label_assignments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can assign labels"
  ON public.epic_label_assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can remove label assignments"
  ON public.epic_label_assignments FOR DELETE
  USING (auth.role() = 'authenticated');

-- Insert some default labels
INSERT INTO public.epic_labels (name, color) VALUES
  ('High Priority', 'red'),
  ('Innovation', 'purple'),
  ('Technical Debt', 'orange'),
  ('Customer Request', 'blue'),
  ('Quick Win', 'green'),
  ('Strategic', 'teal')
ON CONFLICT (name) DO NOTHING;