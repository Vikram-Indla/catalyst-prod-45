-- Add theme_id to strategy_snapshots to link each snapshot to a specific theme
ALTER TABLE public.strategy_snapshots 
ADD COLUMN theme_id uuid REFERENCES public.strategic_themes(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_strategy_snapshots_theme_id ON public.strategy_snapshots(theme_id);

-- Add comment for documentation
COMMENT ON COLUMN public.strategy_snapshots.theme_id IS 'Links the snapshot to a specific strategic theme for the new hierarchy: Theme > Snapshot > Objectives > Epics';