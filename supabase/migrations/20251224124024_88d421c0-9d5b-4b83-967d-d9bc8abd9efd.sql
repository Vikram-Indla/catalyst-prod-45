-- Create user_starred_items table for tracking starred work items
CREATE TABLE public.user_starred_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('epic', 'feature', 'story', 'task', 'incident', 'defect')),
  starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_user_starred_items_user_id ON public.user_starred_items(user_id);
CREATE INDEX idx_user_starred_items_item ON public.user_starred_items(item_id, item_type);
CREATE INDEX idx_user_starred_items_starred_at ON public.user_starred_items(starred_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_starred_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own starred items
CREATE POLICY "Users can view their own starred items" 
ON public.user_starred_items 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can star items for themselves
CREATE POLICY "Users can star items" 
ON public.user_starred_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can unstar their own items
CREATE POLICY "Users can unstar their own items" 
ON public.user_starred_items 
FOR DELETE 
USING (auth.uid() = user_id);