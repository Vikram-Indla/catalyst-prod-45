
-- Create user_recent_items table
CREATE TABLE public.user_recent_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  issue_id UUID NOT NULL,
  issue_key TEXT NOT NULL,
  issue_type TEXT NOT NULL DEFAULT 'task',
  summary TEXT NOT NULL DEFAULT '',
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, issue_id)
);

-- Indexes
CREATE INDEX idx_user_recent_items_user_project ON public.user_recent_items(user_id, project_id, visited_at DESC);
CREATE INDEX idx_user_recent_items_visited ON public.user_recent_items(visited_at DESC);

-- Enable RLS
ALTER TABLE public.user_recent_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own recent items"
ON public.user_recent_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recent items"
ON public.user_recent_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recent items"
ON public.user_recent_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recent items"
ON public.user_recent_items FOR DELETE
USING (auth.uid() = user_id);

-- Auto-prune trigger: keep max 10 per user per project
CREATE OR REPLACE FUNCTION public.prune_user_recent_items()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_recent_items
  WHERE id IN (
    SELECT id FROM public.user_recent_items
    WHERE user_id = NEW.user_id AND project_id = NEW.project_id
    ORDER BY visited_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_prune_user_recent_items
AFTER INSERT OR UPDATE ON public.user_recent_items
FOR EACH ROW
EXECUTE FUNCTION public.prune_user_recent_items();

-- Updated_at trigger
CREATE TRIGGER update_user_recent_items_updated_at
BEFORE UPDATE ON public.user_recent_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
