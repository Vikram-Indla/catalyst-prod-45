-- Create generation_items table if not exists
CREATE TABLE IF NOT EXISTS generation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
  temp_display_id TEXT NOT NULL,
  permanent_display_id TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('prd', 'epic', 'feature', 'story', 'task', 'test_case')),
  parent_id UUID REFERENCES generation_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria JSONB DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(5,2) DEFAULT 85.00,
  confidence_reason TEXT,
  is_selected BOOLEAN DEFAULT true,
  is_edited BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE generation_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view generation items" 
ON generation_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert generation items" 
ON generation_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update generation items" 
ON generation_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete generation items" 
ON generation_items 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generation_items_generation_id ON generation_items(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_items_parent_id ON generation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_generation_items_item_type ON generation_items(item_type);
CREATE INDEX IF NOT EXISTS idx_generation_items_is_published ON generation_items(is_published);

-- Add code column to programs if not exists (alias for key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'code') THEN
    ALTER TABLE programs ADD COLUMN code TEXT GENERATED ALWAYS AS (key) STORED;
  END IF;
END $$;

-- Add code column to projects if not exists (alias for key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'code') THEN
    ALTER TABLE projects ADD COLUMN code TEXT GENERATED ALWAYS AS (key) STORED;
  END IF;
END $$;