-- Add mentions tracking table for @mentions in comments
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notification_sent BOOLEAN DEFAULT false,
  UNIQUE(comment_id, mentioned_user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user 
  ON public.comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment 
  ON public.comment_mentions(comment_id);

-- Enable RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comment mentions" 
  ON public.comment_mentions FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create mentions" 
  ON public.comment_mentions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);