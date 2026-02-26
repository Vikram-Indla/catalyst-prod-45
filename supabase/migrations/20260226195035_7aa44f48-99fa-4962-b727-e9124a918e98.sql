
-- Add avatar_url column to resource_inventory
ALTER TABLE resource_inventory ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_resource_inventory_avatar_url ON resource_inventory(avatar_url);

-- Function to sync avatar_url from profiles via profile_id
CREATE OR REPLACE FUNCTION public.sync_avatar_urls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE resource_inventory ri
  SET avatar_url = p.avatar_url
  FROM profiles p
  WHERE ri.profile_id = p.id
    AND p.avatar_url IS NOT NULL
    AND (ri.avatar_url IS DISTINCT FROM p.avatar_url);
END;
$$;

-- Run the sync now
SELECT public.sync_avatar_urls();
