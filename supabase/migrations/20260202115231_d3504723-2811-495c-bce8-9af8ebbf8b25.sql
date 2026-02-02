-- Add source tracking columns to aqd_items
ALTER TABLE aqd_items ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE aqd_items ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Create AI suggestions tracking table
CREATE TABLE IF NOT EXISTS aqd_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES aqd_lists(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES aqd_weeks(id) ON DELETE CASCADE,
  task_key VARCHAR(50) NOT NULL,
  task_title TEXT NOT NULL,
  task_priority VARCHAR(20),
  task_due_date DATE,
  task_assignee_id UUID REFERENCES profiles(id),
  task_assignee_name TEXT,
  ai_reasoning TEXT,
  ai_score INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE aqd_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suggestions
CREATE POLICY "Users can view their list suggestions"
ON aqd_ai_suggestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM aqd_lists
    WHERE aqd_lists.id = aqd_ai_suggestions.list_id
  )
);

CREATE POLICY "Users can insert suggestions"
ON aqd_ai_suggestions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update suggestions"
ON aqd_ai_suggestions
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete suggestions"
ON aqd_ai_suggestions
FOR DELETE
USING (true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_aqd_suggestions_list_week ON aqd_ai_suggestions(list_id, week_id, status);
CREATE INDEX IF NOT EXISTS idx_aqd_suggestions_created ON aqd_ai_suggestions(created_at);