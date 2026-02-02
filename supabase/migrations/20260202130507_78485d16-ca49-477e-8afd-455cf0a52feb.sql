-- ============================================
-- Task¹⁰ Activity History Table
-- ============================================

-- Create activity log table for tracking all item changes
CREATE TABLE IF NOT EXISTS public.aqd_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.aqd_items(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Index for timeline queries (newest first by item)
CREATE INDEX IF NOT EXISTS idx_aqd_activity_item ON public.aqd_activity(item_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.aqd_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aqd_activity
CREATE POLICY "Users can view activity" ON public.aqd_activity
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create activity" ON public.aqd_activity
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add is_deleted column to aqd_item_notes if not exists (for soft delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aqd_item_notes' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.aqd_item_notes ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- Add updated_by column to aqd_item_notes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aqd_item_notes' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.aqd_item_notes ADD COLUMN updated_by UUID REFERENCES public.profiles(id);
  END IF;
END
$$;

-- Create index for notes (excluding deleted)
CREATE INDEX IF NOT EXISTS idx_aqd_notes_item ON public.aqd_item_notes(item_id) WHERE is_deleted = FALSE OR is_deleted IS NULL;