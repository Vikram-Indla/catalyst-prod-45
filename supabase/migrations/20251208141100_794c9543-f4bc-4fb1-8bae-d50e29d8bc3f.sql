-- Create work_item_versions table for fix/affects version linking
CREATE TABLE public.work_item_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'story', 'defect', 'task', 'subtask')),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('fix', 'affects')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(work_item_id, work_item_type, release_id, link_type)
);

-- Create index for efficient lookups
CREATE INDEX idx_work_item_versions_item ON public.work_item_versions(work_item_id, work_item_type);
CREATE INDEX idx_work_item_versions_release ON public.work_item_versions(release_id);
CREATE INDEX idx_work_item_versions_type ON public.work_item_versions(link_type);

-- Enable RLS
ALTER TABLE public.work_item_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view work item versions"
  ON public.work_item_versions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage work item versions"
  ON public.work_item_versions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);