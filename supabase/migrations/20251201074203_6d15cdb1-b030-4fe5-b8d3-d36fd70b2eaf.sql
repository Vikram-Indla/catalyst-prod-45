-- Add missing columns to existing stories table
ALTER TABLE public.stories 
  ADD COLUMN IF NOT EXISTS story_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'backlog',
  ADD COLUMN IF NOT EXISTS story_points INTEGER,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS rank_order INTEGER,
  ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parked_at TIMESTAMPTZ;

-- Update title from name if title is null
UPDATE public.stories SET title = name WHERE title IS NULL;

-- Make title NOT NULL after populating
ALTER TABLE public.stories ALTER COLUMN title SET NOT NULL;

-- Story comments table
CREATE TABLE IF NOT EXISTS public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on story_comments
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any and recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view comments on stories they can see" ON public.story_comments;
  DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.story_comments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Users can view comments on stories they can see"
  ON public.story_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories WHERE id = story_comments.story_id
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.story_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_feature_id ON public.stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_stories_team_id ON public.stories(team_id);
CREATE INDEX IF NOT EXISTS idx_stories_sprint_id ON public.stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_stories_state ON public.stories(state);
CREATE INDEX IF NOT EXISTS idx_stories_deleted_at ON public.stories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);