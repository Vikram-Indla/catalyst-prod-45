-- Add process flow tracking timestamps to epics table
ALTER TABLE epics 
ADD COLUMN IF NOT EXISTS process_step_entered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS process_flow_entered_at TIMESTAMP WITH TIME ZONE;

-- Create user preferences table for Epic Backlog settings
CREATE TABLE IF NOT EXISTS user_epic_backlog_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_columns_main JSONB DEFAULT '[]'::jsonb,
  selected_columns_small JSONB DEFAULT '[]'::jsonb,
  last_view TEXT DEFAULT 'list',
  last_kanban_subview TEXT DEFAULT 'state',
  labels_display TEXT DEFAULT 'program',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on preferences table
ALTER TABLE user_epic_backlog_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for preferences
CREATE POLICY "Users can view their own preferences"
ON user_epic_backlog_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON user_epic_backlog_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON user_epic_backlog_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add exit criteria to process steps
ALTER TABLE process_steps 
ADD COLUMN IF NOT EXISTS exit_criteria TEXT[];

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_epic_backlog_prefs_user_id ON user_epic_backlog_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_epics_process_step_entered_at ON epics(process_step_entered_at);

-- Update updated_at timestamp trigger for preferences
CREATE OR REPLACE FUNCTION update_user_epic_backlog_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_epic_backlog_preferences_updated_at
BEFORE UPDATE ON user_epic_backlog_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_epic_backlog_preferences_updated_at();