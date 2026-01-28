
-- Create workstream_members junction table
CREATE TABLE IF NOT EXISTS public.workstream_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream_id UUID NOT NULL REFERENCES public.planner_workstreams(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resource_inventory(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workstream_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.workstream_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workstream members are viewable by authenticated users" 
ON public.workstream_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workstream members can be added by authenticated users" 
ON public.workstream_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Workstream members can be removed by authenticated users" 
ON public.workstream_members FOR DELETE TO authenticated USING (true);

-- Create index for faster lookups
CREATE INDEX idx_workstream_members_workstream ON public.workstream_members(workstream_id);
CREATE INDEX idx_workstream_members_resource ON public.workstream_members(resource_id);
