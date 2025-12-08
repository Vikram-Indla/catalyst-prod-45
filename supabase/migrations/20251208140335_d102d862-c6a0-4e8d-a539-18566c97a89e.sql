-- Create saved_filters table for Issue Navigator
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query TEXT,
  type TEXT DEFAULT 'all',
  status TEXT DEFAULT 'all',
  is_starred BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can only view their own filters
CREATE POLICY "Users can view their own filters"
ON public.saved_filters
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own filters
CREATE POLICY "Users can create their own filters"
ON public.saved_filters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own filters
CREATE POLICY "Users can update their own filters"
ON public.saved_filters
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own filters
CREATE POLICY "Users can delete their own filters"
ON public.saved_filters
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_filters_user_id ON public.saved_filters(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_filters_updated_at
BEFORE UPDATE ON public.saved_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();