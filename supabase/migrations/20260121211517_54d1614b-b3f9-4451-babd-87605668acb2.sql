-- ═══════════════════════════════════════════════════════════════
-- SPACE WORK ITEMS - Epics, Features, Stories scoped to Spaces
-- This enables each Space to have its own work item hierarchy
-- ═══════════════════════════════════════════════════════════════

-- Create space work item type enum
DO $$ BEGIN
  CREATE TYPE space_work_item_type AS ENUM ('epic', 'feature', 'story', 'task', 'bug', 'subtask');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create space work item status enum
DO $$ BEGIN
  CREATE TYPE space_work_item_status AS ENUM ('backlog', 'ready', 'in_progress', 'in_review', 'blocked', 'done', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the space_work_items table
CREATE TABLE IF NOT EXISTS public.space_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  
  -- Key and sequence (auto-generated based on space key)
  key TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  
  -- Work item type
  type space_work_item_type NOT NULL,
  
  -- Core fields
  summary TEXT NOT NULL,
  description TEXT,
  
  -- Hierarchy links (within space)
  parent_id UUID REFERENCES public.space_work_items(id) ON DELETE SET NULL,
  
  -- Assignment
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Priority (using existing values)
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('highest', 'high', 'medium', 'low', 'lowest')),
  
  -- Status
  status space_work_item_status NOT NULL DEFAULT 'backlog',
  
  -- Planning
  story_points INTEGER,
  labels TEXT[] DEFAULT '{}',
  
  -- Component & Version links
  component_id UUID REFERENCES public.space_components(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.space_versions(id) ON DELETE SET NULL,
  
  -- Ordering
  rank_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  UNIQUE(space_id, key),
  UNIQUE(space_id, sequence_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_space_work_items_space_id ON public.space_work_items(space_id);
CREATE INDEX IF NOT EXISTS idx_space_work_items_type ON public.space_work_items(type);
CREATE INDEX IF NOT EXISTS idx_space_work_items_status ON public.space_work_items(status);
CREATE INDEX IF NOT EXISTS idx_space_work_items_parent_id ON public.space_work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_space_work_items_assignee_id ON public.space_work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_space_work_items_component_id ON public.space_work_items(component_id);
CREATE INDEX IF NOT EXISTS idx_space_work_items_version_id ON public.space_work_items(version_id);

-- Enable RLS
ALTER TABLE public.space_work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can access work items if they are members of the space
CREATE POLICY "space_work_items_select" ON public.space_work_items
FOR SELECT USING (
  space_id IN (
    SELECT space_id FROM public.space_members WHERE user_id = auth.uid()
  )
  OR space_id IN (
    SELECT id FROM public.spaces WHERE created_by = auth.uid()
  )
);

CREATE POLICY "space_work_items_insert" ON public.space_work_items
FOR INSERT WITH CHECK (
  space_id IN (
    SELECT space_id FROM public.space_members WHERE user_id = auth.uid()
  )
  OR space_id IN (
    SELECT id FROM public.spaces WHERE created_by = auth.uid()
  )
);

CREATE POLICY "space_work_items_update" ON public.space_work_items
FOR UPDATE USING (
  space_id IN (
    SELECT space_id FROM public.space_members WHERE user_id = auth.uid()
  )
  OR space_id IN (
    SELECT id FROM public.spaces WHERE created_by = auth.uid()
  )
);

CREATE POLICY "space_work_items_delete" ON public.space_work_items
FOR DELETE USING (
  space_id IN (
    SELECT space_id FROM public.space_members WHERE user_id = auth.uid() AND role IN ('administrator', 'member')
  )
  OR space_id IN (
    SELECT id FROM public.spaces WHERE created_by = auth.uid()
  )
);

-- Function to auto-generate work item key
CREATE OR REPLACE FUNCTION public.generate_space_work_item_key()
RETURNS TRIGGER AS $$
DECLARE
  space_key TEXT;
  next_seq INTEGER;
BEGIN
  -- Get the space key
  SELECT key INTO space_key FROM public.spaces WHERE id = NEW.space_id;
  
  -- Get next sequence number for this space
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM public.space_work_items
  WHERE space_id = NEW.space_id;
  
  -- Set the key and sequence
  NEW.sequence_number := next_seq;
  NEW.key := space_key || '-' || next_seq;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate key on insert
DROP TRIGGER IF EXISTS trg_generate_space_work_item_key ON public.space_work_items;
CREATE TRIGGER trg_generate_space_work_item_key
  BEFORE INSERT ON public.space_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_space_work_item_key();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_space_work_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_space_work_item_timestamp ON public.space_work_items;
CREATE TRIGGER trg_update_space_work_item_timestamp
  BEFORE UPDATE ON public.space_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_space_work_item_timestamp();

-- Enable realtime for work items
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_work_items;