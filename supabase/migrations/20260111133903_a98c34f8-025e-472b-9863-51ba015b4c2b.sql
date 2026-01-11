-- ═══════════════════════════════════════════════════════════════
-- WORK ITEMS MODULE — Phase 1 Foundation
-- Creates work_items table with proper types, statuses, and indexes
-- Uses EXISTING priority_level and severity_level enums
-- ═══════════════════════════════════════════════════════════════

-- Create work item type enum
DO $$ BEGIN
  CREATE TYPE work_item_type AS ENUM ('story', 'task', 'defect', 'subtask');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create work item status enum  
DO $$ BEGIN
  CREATE TYPE work_item_status AS ENUM ('backlog', 'ready', 'in_progress', 'in_review', 'blocked', 'done', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create work_items table (using existing priority_level P1-P4 and severity_level SEV1-SEV4)
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,              -- "PROJ-123"
  sequence_number INTEGER NOT NULL,
  
  type work_item_type NOT NULL,          -- 'story' | 'task' | 'defect' | 'subtask'
  
  summary TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id) ON DELETE SET NULL,
  parent_work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  
  status work_item_status NOT NULL DEFAULT 'backlog',
  
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  priority priority_level NOT NULL DEFAULT 'P3',  -- Using existing enum: P1, P2, P3, P4
  story_points INTEGER,                  -- Fibonacci: 1,2,3,5,8,13,21
  
  fixed_version_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  
  due_date DATE,
  labels TEXT[],
  
  -- Defect-specific fields
  severity severity_level,  -- Using existing enum: SEV1, SEV2, SEV3, SEV4
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_feature ON work_items(feature_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_items_fixed_version ON work_items(fixed_version_id);
CREATE INDEX IF NOT EXISTS idx_work_items_parent ON work_items(parent_work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items(type);
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);

-- Enable Row Level Security
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read all work items
CREATE POLICY "Authenticated users can view work items" 
ON work_items 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policy: Allow authenticated users to insert work items
CREATE POLICY "Authenticated users can create work items" 
ON work_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update work items
CREATE POLICY "Authenticated users can update work items" 
ON work_items 
FOR UPDATE 
TO authenticated 
USING (true);

-- RLS Policy: Allow authenticated users to delete work items
CREATE POLICY "Authenticated users can delete work items" 
ON work_items 
FOR DELETE 
TO authenticated 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_work_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS work_items_updated_at ON work_items;
CREATE TRIGGER work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_work_items_updated_at();

-- Create function to auto-generate work item key
CREATE OR REPLACE FUNCTION generate_work_item_key()
RETURNS TRIGGER AS $$
DECLARE
  project_key TEXT;
  next_seq INTEGER;
BEGIN
  -- Get project key
  SELECT key INTO project_key FROM projects WHERE id = NEW.project_id;
  
  -- Get next sequence number for this project
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM work_items
  WHERE project_id = NEW.project_id;
  
  -- Set the sequence number and key
  NEW.sequence_number := next_seq;
  NEW.key := COALESCE(project_key, 'WI') || '-' || next_seq;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS work_items_generate_key ON work_items;
CREATE TRIGGER work_items_generate_key
  BEFORE INSERT ON work_items
  FOR EACH ROW
  WHEN (NEW.key IS NULL OR NEW.sequence_number IS NULL)
  EXECUTE FUNCTION generate_work_item_key();