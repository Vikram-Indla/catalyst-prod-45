-- Add epic_ids to snapshot_strategy_links for linking epics to snapshots
ALTER TABLE public.snapshot_strategy_links 
ADD COLUMN IF NOT EXISTS epic_ids uuid[] DEFAULT '{}';

-- Create theme_epic_links junction table for theme-epic alignment
CREATE TABLE IF NOT EXISTS public.theme_epic_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id uuid NOT NULL REFERENCES public.strategic_themes(id) ON DELETE CASCADE,
  epic_id uuid NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(theme_id, epic_id)
);

-- Enable RLS
ALTER TABLE public.theme_epic_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for theme_epic_links
CREATE POLICY "Allow all authenticated users to view theme_epic_links"
ON public.theme_epic_links FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage theme_epic_links"
ON public.theme_epic_links FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_theme_epic_links_theme_id ON public.theme_epic_links(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_epic_links_epic_id ON public.theme_epic_links(epic_id);