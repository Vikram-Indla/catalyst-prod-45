-- Create enum for room types
CREATE TYPE room_type AS ENUM (
  'portfolio',
  'program', 
  'team',
  'strategy',
  'epic',
  'feature',
  'objective',
  'roadmap',
  'product'
);

-- Create starred_items table
CREATE TABLE starred_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_type room_type NOT NULL,
  room_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_subtitle TEXT,
  room_path TEXT NOT NULL,
  pi_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recent_activity table
CREATE TABLE recent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_type room_type NOT NULL,
  room_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_subtitle TEXT,
  room_path TEXT NOT NULL,
  pi_label TEXT,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, room_type, room_id)
);

-- Enable RLS
ALTER TABLE starred_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for starred_items
CREATE POLICY "Users can view their own starred items"
  ON starred_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own starred items"
  ON starred_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own starred items"
  ON starred_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for recent_activity
CREATE POLICY "Users can view their own recent activity"
  ON recent_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recent activity"
  ON recent_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recent activity"
  ON recent_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_starred_items_user_id ON starred_items(user_id);
CREATE INDEX idx_starred_items_room ON starred_items(room_type, room_id);
CREATE INDEX idx_recent_activity_user_id ON recent_activity(user_id);
CREATE INDEX idx_recent_activity_last_accessed ON recent_activity(user_id, last_accessed_at DESC);

-- Function to track room access
CREATE OR REPLACE FUNCTION track_room_access(
  p_user_id UUID,
  p_room_type room_type,
  p_room_id UUID,
  p_room_name TEXT,
  p_room_subtitle TEXT,
  p_room_path TEXT,
  p_pi_label TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO recent_activity (
    user_id, room_type, room_id, room_name, room_subtitle, room_path, pi_label, last_accessed_at, access_count
  )
  VALUES (
    p_user_id, p_room_type, p_room_id, p_room_name, p_room_subtitle, p_room_path, p_pi_label, NOW(), 1
  )
  ON CONFLICT (user_id, room_type, room_id)
  DO UPDATE SET
    last_accessed_at = NOW(),
    access_count = recent_activity.access_count + 1,
    room_name = EXCLUDED.room_name,
    room_subtitle = EXCLUDED.room_subtitle,
    room_path = EXCLUDED.room_path,
    pi_label = EXCLUDED.pi_label;
END;
$$;