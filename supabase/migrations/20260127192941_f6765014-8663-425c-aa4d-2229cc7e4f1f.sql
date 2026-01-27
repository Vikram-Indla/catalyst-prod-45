
-- ============================================================
-- MY TASKS BUSINESS RULES - Part 2: Watchers and Mentions Tables
-- ============================================================

-- Create planner_task_watchers table (many-to-many)
CREATE TABLE IF NOT EXISTS planner_task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS on watchers table
ALTER TABLE planner_task_watchers ENABLE ROW LEVEL SECURITY;

-- RLS policies for watchers
CREATE POLICY "Users can view watchers for tasks they can access"
  ON planner_task_watchers FOR SELECT
  USING (true);

CREATE POLICY "Users can watch tasks"
  ON planner_task_watchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unwatch tasks"
  ON planner_task_watchers FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for watchers
CREATE INDEX IF NOT EXISTS idx_planner_task_watchers_task_id ON planner_task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_planner_task_watchers_user_id ON planner_task_watchers(user_id);

-- Create planner_task_mentions table
CREATE TABLE IF NOT EXISTS planner_task_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('description', 'comment')) DEFAULT 'description',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id, source)
);

-- Enable RLS on mentions table
ALTER TABLE planner_task_mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentions
CREATE POLICY "Users can view mentions"
  ON planner_task_mentions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add mentions"
  ON planner_task_mentions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete mentions"
  ON planner_task_mentions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create indexes for mentions
CREATE INDEX IF NOT EXISTS idx_planner_task_mentions_task_id ON planner_task_mentions(task_id);
CREATE INDEX IF NOT EXISTS idx_planner_task_mentions_user_id ON planner_task_mentions(user_id);

-- Enable realtime on the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE planner_task_watchers;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_task_mentions;
