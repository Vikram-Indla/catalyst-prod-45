-- Add filter_id FK to boards so a Kanban board can be driven by a saved filter (O10)
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS filter_id UUID
    REFERENCES public.ph_saved_filters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_filter_id ON public.boards (filter_id)
  WHERE filter_id IS NOT NULL;
