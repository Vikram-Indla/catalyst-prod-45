-- Fix snapshot deletion by cascading linked themes
-- Existing constraint blocks deleting a snapshot that has strategic themes.

ALTER TABLE public.strategic_themes
  DROP CONSTRAINT IF EXISTS strategic_themes_snapshot_id_fkey;

ALTER TABLE public.strategic_themes
  ADD CONSTRAINT strategic_themes_snapshot_id_fkey
  FOREIGN KEY (snapshot_id)
  REFERENCES public.strategy_snapshots(id)
  ON DELETE CASCADE;