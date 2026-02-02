-- ============================================
-- Task¹⁰ Checklist Table for Priority Items
-- ============================================

CREATE TABLE IF NOT EXISTS public.aqd_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.aqd_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Index for fast lookups by item
CREATE INDEX IF NOT EXISTS idx_aqd_checklists_item ON public.aqd_checklists(item_id, sort_order);

-- Enable RLS
ALTER TABLE public.aqd_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view checklists" ON public.aqd_checklists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create checklists" ON public.aqd_checklists
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update checklists" ON public.aqd_checklists
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete checklists" ON public.aqd_checklists
  FOR DELETE TO authenticated USING (true);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.aqd_checklists;