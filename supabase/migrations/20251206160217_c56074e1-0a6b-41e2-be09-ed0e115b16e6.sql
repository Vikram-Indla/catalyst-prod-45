-- Fix recent_activity for room-level deduplication (Jira Align parity)
-- One entry per room (roomType + roomId), subtitle shows last visited page

-- First, clean up duplicate entries keeping only the most recent per room
DELETE FROM recent_activity ra
WHERE ra.id NOT IN (
  SELECT DISTINCT ON (user_id, room_type, room_id) id
  FROM recent_activity
  ORDER BY user_id, room_type, room_id, last_accessed_at DESC
);

-- Drop the old constraint
ALTER TABLE recent_activity DROP CONSTRAINT IF EXISTS recent_activity_user_id_room_type_room_id_page_key_key;

-- Add new room-level unique constraint
ALTER TABLE recent_activity ADD CONSTRAINT recent_activity_user_room_unique 
  UNIQUE (user_id, room_type, room_id);

-- Drop and recreate the track_room_access function for room-level deduplication
DROP FUNCTION IF EXISTS public.track_room_access(uuid, room_type, uuid, text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.track_room_access(uuid, room_type, uuid, text, text, text, text);

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
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_count integer;
  v_oldest_id uuid;
BEGIN
  -- UPSERT at room level (one entry per room, not per page)
  INSERT INTO recent_activity (
    user_id, room_type, room_id, room_name, room_subtitle, room_path, 
    pi_label, page_key, timebox_type, timebox_id, last_accessed_at, access_count
  )
  VALUES (
    p_user_id, p_room_type, p_room_id, p_room_name, p_room_subtitle, p_room_path, 
    p_pi_label, p_page_key, p_timebox_type, p_timebox_id, NOW(), 1
  )
  ON CONFLICT (user_id, room_type, room_id)
  DO UPDATE SET
    last_accessed_at = NOW(),
    access_count = recent_activity.access_count + 1,
    room_name = EXCLUDED.room_name,
    room_subtitle = EXCLUDED.room_subtitle,  -- Update to show last visited page
    room_path = EXCLUDED.room_path,          -- Update to latest path
    page_key = EXCLUDED.page_key,            -- Update page key
    pi_label = EXCLUDED.pi_label,
    timebox_type = EXCLUDED.timebox_type,
    timebox_id = EXCLUDED.timebox_id;

  -- Prune to keep only 12 most recent entries per user
  SELECT COUNT(*) INTO v_entry_count
  FROM recent_activity
  WHERE user_id = p_user_id;

  IF v_entry_count > 12 THEN
    -- Delete oldest entries beyond 12
    DELETE FROM recent_activity
    WHERE id IN (
      SELECT id FROM recent_activity
      WHERE user_id = p_user_id
      ORDER BY last_accessed_at ASC
      LIMIT (v_entry_count - 12)
    );
  END IF;
END;
$$;