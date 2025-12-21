-- Acceptance Criteria table
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_met BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_story ON acceptance_criteria(story_id);

-- RLS
ALTER TABLE acceptance_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view acceptance criteria"
  ON acceptance_criteria FOR SELECT USING (true);

CREATE POLICY "Users can manage acceptance criteria"
  ON acceptance_criteria FOR ALL USING (true);

-- Add type column to subtasks if not exists
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'technical' CHECK (type IN ('frontend', 'backend', 'integration', 'technical'));

-- Add release_id to subtasks if not exists
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES releases(id);

-- Add order_index to subtasks if not exists
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;