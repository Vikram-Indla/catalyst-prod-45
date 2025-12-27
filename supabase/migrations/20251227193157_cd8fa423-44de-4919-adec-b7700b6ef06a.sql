-- Allow creating strategic themes before a snapshot exists
ALTER TABLE public.strategic_themes
  ALTER COLUMN snapshot_id DROP NOT NULL;