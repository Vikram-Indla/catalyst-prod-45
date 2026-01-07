-- Add soft delete columns to ai_assist_drafts (if not exist)
DO $$
BEGIN
  -- Add is_deleted column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'ai_assist_drafts' 
                 AND column_name = 'is_deleted') THEN
    ALTER TABLE public.ai_assist_drafts ADD COLUMN is_deleted boolean DEFAULT false NOT NULL;
  END IF;
  
  -- Add deleted_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'ai_assist_drafts' 
                 AND column_name = 'deleted_by') THEN
    ALTER TABLE public.ai_assist_drafts ADD COLUMN deleted_by uuid NULL;
  END IF;
END $$;

-- Create index on is_deleted for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ai_assist_drafts_is_deleted ON public.ai_assist_drafts(is_deleted) WHERE is_deleted = false;

-- Update RLS policies to only show non-deleted drafts and allow soft delete
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "ai_assist_drafts_select" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "ai_assist_drafts_update" ON public.ai_assist_drafts;

-- Allow selecting only non-deleted drafts for all authenticated users
CREATE POLICY "ai_assist_drafts_select" ON public.ai_assist_drafts
  FOR SELECT
  USING (is_deleted = false);

-- Allow update (including soft delete) for authenticated users on their own drafts or for anyone (admin check in app layer)
CREATE POLICY "ai_assist_drafts_update" ON public.ai_assist_drafts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);