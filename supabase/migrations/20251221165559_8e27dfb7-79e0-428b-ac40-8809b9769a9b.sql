-- Add change_number_id to subtasks if not exists
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS change_number_id UUID REFERENCES change_numbers(id);

-- Create index for change_number
CREATE INDEX IF NOT EXISTS idx_subtasks_change_number ON subtasks(change_number_id);