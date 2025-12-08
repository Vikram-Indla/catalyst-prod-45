-- Create unified work item labels table (replacing epic_labels)
CREATE TABLE IF NOT EXISTS public.work_item_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(name)
);

-- Create unified label assignments table
CREATE TABLE IF NOT EXISTS public.work_item_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id UUID NOT NULL REFERENCES public.work_item_labels(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'epic', 'feature', 'story'
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(label_id, entity_type, entity_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_work_item_label_assignments_entity 
  ON public.work_item_label_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_work_item_label_assignments_label 
  ON public.work_item_label_assignments(label_id);

-- Enable RLS
ALTER TABLE public.work_item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow authenticated users to manage labels
CREATE POLICY "Authenticated users can view labels" 
  ON public.work_item_labels FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create labels" 
  ON public.work_item_labels FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update labels" 
  ON public.work_item_labels FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete labels" 
  ON public.work_item_labels FOR DELETE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view label assignments" 
  ON public.work_item_label_assignments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can manage label assignments" 
  ON public.work_item_label_assignments FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Migrate existing epic_labels data
INSERT INTO public.work_item_labels (id, name, color, created_at, created_by)
SELECT id, name, color, created_at, created_by 
FROM public.epic_labels
ON CONFLICT (name) DO NOTHING;

-- Migrate existing epic_label_assignments
INSERT INTO public.work_item_label_assignments (label_id, entity_type, entity_id, created_at)
SELECT label_id, 'epic', epic_id, created_at 
FROM public.epic_label_assignments
ON CONFLICT DO NOTHING;

-- Insert default labels
INSERT INTO public.work_item_labels (name, color, description) VALUES
('Bug', 'red', 'Indicates a bug or defect'),
('Enhancement', 'blue', 'Feature enhancement or improvement'),
('High Priority', 'orange', 'High priority item'),
('Technical Debt', 'purple', 'Technical debt to address'),
('Documentation', 'cyan', 'Documentation related'),
('Testing', 'green', 'Testing related work'),
('Security', 'red', 'Security related'),
('Performance', 'yellow', 'Performance improvement')
ON CONFLICT (name) DO NOTHING;