-- Add new columns to recent_activity for proper place tracking
ALTER TABLE public.recent_activity 
ADD COLUMN IF NOT EXISTS page_key text NOT NULL DEFAULT 'room',
ADD COLUMN IF NOT EXISTS timebox_type text,
ADD COLUMN IF NOT EXISTS timebox_id uuid;

-- Drop the old unique constraint
ALTER TABLE public.recent_activity 
DROP CONSTRAINT IF EXISTS recent_activity_user_id_room_type_room_id_key;

-- Create new unique constraint based on place_key concept (user_id + room_type + room_id + page_key)
ALTER TABLE public.recent_activity 
ADD CONSTRAINT recent_activity_user_place_key UNIQUE (user_id, room_type, room_id, page_key);

-- Update the track_room_access function to handle new columns
CREATE OR REPLACE FUNCTION public.track_room_access(
  p_user_id uuid,
  p_room_type room_type,
  p_room_id uuid,
  p_room_name text,
  p_room_subtitle text,
  p_room_path text,
  p_pi_label text DEFAULT NULL,
  p_page_key text DEFAULT 'room',
  p_timebox_type text DEFAULT NULL,
  p_timebox_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO recent_activity (
    user_id, room_type, room_id, room_name, room_subtitle, room_path, 
    pi_label, page_key, timebox_type, timebox_id, last_accessed_at, access_count
  )
  VALUES (
    p_user_id, p_room_type, p_room_id, p_room_name, p_room_subtitle, p_room_path, 
    p_pi_label, p_page_key, p_timebox_type, p_timebox_id, NOW(), 1
  )
  ON CONFLICT (user_id, room_type, room_id, page_key)
  DO UPDATE SET
    last_accessed_at = NOW(),
    access_count = recent_activity.access_count + 1,
    room_name = EXCLUDED.room_name,
    room_subtitle = EXCLUDED.room_subtitle,
    room_path = EXCLUDED.room_path,
    pi_label = EXCLUDED.pi_label,
    timebox_type = EXCLUDED.timebox_type,
    timebox_id = EXCLUDED.timebox_id;
END;
$$;